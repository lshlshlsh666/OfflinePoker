from dataclasses import dataclass

@dataclass
class Config:
    SMALL_BLIND: int = 10
    BIG_BLIND: int = 20
    MAX_INITIAL_CHIPS: int = 1000
    GREEDY_PENALTY: int = 100