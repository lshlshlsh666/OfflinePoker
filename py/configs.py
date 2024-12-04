from dataclasses import dataclass

@dataclass
class Config:
    SMALL_BLIND: int = 10
    BIG_BLIND: int = 20