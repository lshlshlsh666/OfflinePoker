const rank_map = {
    0: '2',
    1: '3',
    2: '4',
    3: '5',
    4: '6',
    5: '7',
    6: '8',
    7: '9',
    8: '10',
    9: 'j',
    10: 'q',
    11: 'k',
    12: 'a'
}

const suit_map = {
    0: 's',
    1: 'h',
    2: 'd',
    3: 'c'
}

export function int_to_card(card_index) {
    const rank = rank_map[card_index % 13];
    const suit = suit_map[card_index / 13];
    return `pcard-${rank}${suit}`
}