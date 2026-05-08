from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TagSeed:
    name: str
    description: str = ""
    children: tuple[TagSeed, ...] = ()


TAG_TREE: tuple[TagSeed, ...] = (
    TagSeed(
        "Theme",
        "Broad subject matter, ideas, and recurring concerns in the work.",
        (
            TagSeed(
                "Drama",
                "Serious interpersonal or emotional conflict.",
                (
                    TagSeed("Coming of Age Drama", "A major focus on maturation, education, or first moral independence."),
                    TagSeed("Family Drama", "Conflict and obligation within families or households."),
                    TagSeed("Social Drama", "Drama rooted in social class, manners, institutions, or public reputation."),
                ),
            ),
            TagSeed(
                "Adventure",
                "Journeys, ordeals, quests, or dangerous undertakings.",
                (
                    TagSeed("Quest", "A journey structured around a concrete goal or sacred task."),
                    TagSeed("Survival", "A major focus on endurance against danger, wilderness, illness, or war."),
                    TagSeed("Voyage", "Travel by sea, long journeying, or return from wandering."),
                ),
            ),
            TagSeed(
                "Romance",
                "Love, courtship, marriage, or erotic attachment.",
                (
                    TagSeed("Courtship", "Romantic negotiation, proposal, rejection, or marriage prospects are central."),
                    TagSeed("Tragic Romance", "A romance shaped by loss, death, ruin, or irreconcilable separation."),
                    TagSeed("Love Triangle", "Romantic conflict involving three principal parties."),
                ),
            ),
            TagSeed(
                "Politics",
                "Power, authority, governance, revolution, or public life.",
                (
                    TagSeed("Revolution", "Political revolt, rebellion, or revolutionary violence plays a major role."),
                    TagSeed("Empire", "Imperial ambition, conquest, colonial power, or its consequences are central."),
                    TagSeed("Law and Justice", "Trials, judgment, punishment, legality, or moral justice are prominent."),
                ),
            ),
            TagSeed(
                "Religion",
                "Faith, ritual, theology, spiritual experience, or religious institutions.",
                (
                    TagSeed("Afterlife", "Hell, paradise, ghosts, reincarnation, or posthumous judgment are important."),
                    TagSeed("Providence", "Divine will, fate, grace, or cosmic order shapes events."),
                    TagSeed("Spiritual Crisis", "Characters struggle with belief, doubt, sin, or redemption."),
                ),
            ),
        ),
    ),
    TagSeed(
        "Character",
        "Character roles, identities, archetypes, and relationship patterns.",
        (
            TagSeed(
                "Hero",
                "A central figure presented through heroic action or aspiration.",
                (
                    TagSeed("Epic Hero", "A hero shaped by martial glory, divine favor, destiny, or public honor."),
                    TagSeed("Reluctant Hero", "A hero who resists or doubts the role demanded of them."),
                    TagSeed("Flawed Hero", "A protagonist whose virtues are bound to serious moral or practical failings."),
                ),
            ),
            TagSeed(
                "Antihero",
                "A central figure lacking conventional heroic virtue.",
                (
                    TagSeed("Outsider Protagonist", "The protagonist is socially alienated, exiled, or fundamentally apart."),
                    TagSeed("Morally Ambiguous Protagonist", "The protagonist's ethics are unstable or contested."),
                ),
            ),
            TagSeed(
                "Villain",
                "A major antagonist or destructive force embodied in a character.",
                (
                    TagSeed("Tyrant", "An antagonist exercises oppressive political, familial, or institutional power."),
                    TagSeed("Tempter", "A character draws others into moral, erotic, or spiritual danger."),
                ),
            ),
            TagSeed("Mentor", "A guide, teacher, elder, or advisor has a substantial role."),
            TagSeed("Fool", "A fool, comic servant, clown, or naive truth-teller has a substantial role."),
        ),
    ),
    TagSeed(
        "Style",
        "Narrative, tonal, formal, and genre techniques.",
        (
            TagSeed(
                "Comedy",
                "Comic situations, wit, satire, or social laughter are prominent.",
                (
                    TagSeed("Satire", "Uses ridicule or irony to criticize people, institutions, or ideas."),
                    TagSeed("Comedy of Manners", "Comic focus on etiquette, courtship, class, or social performance."),
                    TagSeed("Farce", "Exaggerated comic action, mistaken identity, or improbable escalation."),
                ),
            ),
            TagSeed(
                "Tragedy",
                "A serious fall, destruction, death, or irreversible loss shapes the work.",
                (
                    TagSeed("Revenge Tragedy", "Revenge motivates major action and moral collapse."),
                    TagSeed("Domestic Tragedy", "Tragedy centered on household, marriage, family, or private life."),
                ),
            ),
            TagSeed(
                "Gothic",
                "Atmosphere of terror, mystery, transgression, or haunted spaces.",
                (
                    TagSeed("Haunted House", "A house, castle, estate, or enclosed place carries uncanny dread."),
                    TagSeed("Madness", "Mental instability, obsession, hallucination, or breakdown is prominent."),
                ),
            ),
            TagSeed("Epistolary", "The work is substantially told through letters, documents, or records."),
            TagSeed("Frame Narrative", "One story is told inside another framing story."),
            TagSeed("Unreliable Narrator", "The narration is significantly partial, deceptive, deluded, or unstable."),
        ),
    ),
    TagSeed(
        "Plot",
        "Plot structures, conflicts, and recurring story devices.",
        (
            TagSeed("Journey", "The plot is organized around travel from place to place."),
            TagSeed("Homecoming", "Return home, failed return, or restoration after absence is central."),
            TagSeed("War", "War, battle, siege, conscription, or military life has a major role."),
            TagSeed("Trial", "A legal, social, or moral trial structures major events."),
            TagSeed("Transformation", "Physical, social, spiritual, or symbolic metamorphosis is central."),
            TagSeed("Mistaken Identity", "Confusion over identity, disguise, or recognition drives the plot."),
        ),
    ),
    TagSeed(
        "Setting",
        "Prominent places, time periods, and environments.",
        (
            TagSeed("Ancient World", "The work is set in or strongly shaped by the ancient Mediterranean or Near East."),
            TagSeed("Medieval World", "Medieval social, religious, or political worlds are central."),
            TagSeed("Victorian Era", "The work is set in or deeply shaped by Victorian society."),
            TagSeed("Rural Setting", "Villages, farms, estates, wilderness, or non-urban life are prominent."),
            TagSeed("Urban Setting", "City life, streets, crowds, institutions, or urban modernity are prominent."),
            TagSeed("Court", "Royal, noble, imperial, or aristocratic court life is important."),
            TagSeed("Sea", "The sea, sailing, ships, islands, or maritime danger are prominent."),
        ),
    ),
)
