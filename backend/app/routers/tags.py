from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.tag import Tag, TagRequest, TagRequestStatus
from app.models.user import User
from app.schemas.tag import (
    TagCreate,
    TagDetail,
    TagRead,
    TagRequestCreate,
    TagRequestRead,
    TagRequestReview,
    TagTreeNode,
    TagUpdate,
)
from app.security import get_current_active_user, require_admin_user
from app.services.tags import approve_tag_request, create_tag, create_tag_request, get_tag_detail, reject_tag_request, update_tag

router = APIRouter(prefix="/tags", tags=["tags"])
tag_requests_router = APIRouter(prefix="/tag-requests", tags=["tag requests"])
admin_router = APIRouter(prefix="/admin/tags", tags=["admin tags"])
admin_tag_requests_router = APIRouter(prefix="/admin/tag-requests", tags=["admin tag requests"])


def _tag_tree_nodes(tags: list[Tag]) -> list[dict]:
    nodes = {
        tag.id: {
            **TagRead.model_validate(tag).model_dump(),
            "children": [],
        }
        for tag in tags
    }
    roots: list[dict] = []
    for tag in tags:
        node = nodes[tag.id]
        if tag.parent_id is not None and tag.parent_id in nodes:
            nodes[tag.parent_id]["children"].append(node)
        else:
            roots.append(node)
    return roots


@router.get("", response_model=list[TagTreeNode])
def list_tags(db: Annotated[Session, Depends(get_db)]):
    tags = db.scalars(select(Tag).order_by(Tag.name.asc(), Tag.id.asc())).all()
    return _tag_tree_nodes(list(tags))


@router.get("/{tag_id}", response_model=TagDetail)
def get_tag(
    tag_id: int,
    db: Annotated[Session, Depends(get_db)],
    show_all: bool = False,
    show_spoilers: bool = False,
):
    return get_tag_detail(db, tag_id, show_all=show_all, show_spoilers=show_spoilers)


@admin_router.post("", response_model=TagRead, status_code=status.HTTP_201_CREATED)
def create_admin_tag(
    payload: TagCreate,
    current_user: Annotated[User, Depends(require_admin_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return create_tag(db, payload, current_user=current_user)


@admin_router.patch("/{tag_id}", response_model=TagRead)
def update_admin_tag(
    tag_id: int,
    payload: TagUpdate,
    current_user: Annotated[User, Depends(require_admin_user)],
    db: Annotated[Session, Depends(get_db)],
):
    void_user = current_user
    del void_user
    return update_tag(db, tag_id, payload)


@tag_requests_router.post("", response_model=TagRequestRead, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: TagRequestCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    return create_tag_request(db, payload, current_user=current_user)


@tag_requests_router.get("/me", response_model=list[TagRequestRead])
def list_my_tag_requests(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    statement = (
        select(TagRequest)
        .where(TagRequest.requested_by_id == current_user.id)
        .order_by(TagRequest.created_at.desc(), TagRequest.id.desc())
    )
    return db.scalars(statement).all()


@admin_tag_requests_router.get("", response_model=list[TagRequestRead])
def list_admin_tag_requests(
    current_user: Annotated[User, Depends(require_admin_user)],
    db: Annotated[Session, Depends(get_db)],
    request_status: TagRequestStatus | None = None,
):
    void_user = current_user
    del void_user
    statement = select(TagRequest).order_by(TagRequest.created_at.desc(), TagRequest.id.desc())
    if request_status is not None:
        statement = statement.where(TagRequest.status == request_status)
    return db.scalars(statement).all()


@admin_tag_requests_router.post("/{tag_request_id}/review", response_model=TagRequestRead)
def review_tag_request(
    tag_request_id: int,
    payload: TagRequestReview,
    current_user: Annotated[User, Depends(require_admin_user)],
    db: Annotated[Session, Depends(get_db)],
):
    tag_request = db.get(TagRequest, tag_request_id)
    if tag_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag request not found")

    if payload.status == TagRequestStatus.APPROVED:
        approve_tag_request(db, tag_request, reviewer=current_user, reviewer_note=payload.reviewer_note)
    else:
        reject_tag_request(db, tag_request, reviewer=current_user, reviewer_note=payload.reviewer_note)

    db.commit()
    db.refresh(tag_request)
    return tag_request
