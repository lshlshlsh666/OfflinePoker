from dataclasses import dataclass
from typing import Literal

from .cards import HandCard

@dataclass
class Player:
    username: str
    chips: int
    handcards: HandCard
    status: Literal['unready', 'ready', 'fold', 'allin']
    my_turn: bool
    session_id: int
    
    def to_dict(self):
        return {
            'username': self.username,
            'chips': self.chips,
            'handcards': self.handcards.cards,
            'status': self.status,
            'my_turn': self.my_turn
        }
        
    def get_handcards(self):
        return self.handcards.dealcards()
    
    def change_chips(self, chips: int):
        if chips < 0 and self.chips + chips < 0:
            raise ValueError('Insufficient chips')
        self.chips += chips

        if self.chips == 0:
            self.status = 'allin'

        return self.chips
    
    def allin(self):
        all_in_chips = self.chips
        self.chips = 0
        self.status = 'allin'
        return all_in_chips