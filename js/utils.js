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

function int_to_card(card_index) {
    const rank = rank_map[card_index % 13];
    const suit = suit_map[Math.floor(card_index / 13)];
    return `pcard-${rank}${suit}`
}

function update_total_chips_label(currentRoundChips = null, totalChips = null) {
    // 将数字格式化为 5 位对齐（右侧填充空格）
    const totalChipsLabel = document.getElementById('total-chips');

    const formattedRound = currentRoundChips === null ? totalChipsLabel.innerHTML.match(/This Round: (.*?) \/ Prev Total:/)[1] : currentRoundChips.toString().padEnd(5, ' ');
    const formattedTotal = totalChips === null ? totalChipsLabel.innerHTML.match(/Prev Total: (.*)/)[1] : totalChips.toString().padEnd(5, ' ');

    totalChipsLabel.innerHTML = `This Round: ${formattedRound.replace(/ /g, '&nbsp;')} / Prev Total: ${formattedTotal.replace(/ /g, '&nbsp;')}`;
}


window.int_to_card = int_to_card;
window.update_total_chips_label = update_total_chips_label;