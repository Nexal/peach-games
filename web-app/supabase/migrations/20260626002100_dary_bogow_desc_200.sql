UPDATE quests SET reward_points = 200, description = 'Ażeby obłaskawić Licho, musicie złożyć na ołtarzu szczere dary: coś ewidentnie pomarańczowego, coś naturalnie gorzkiego i coś o nazwie kojarzącej się z dzieciństwem. Udajcie się do wiejskiego sklepu i dobierzcie asortyment tak, by paragon opiewał dokładnie na 15,50 zł — im bliżej tej kwoty, tym hojniejsza nagroda! Bazowo 200 ogników, ale precyzja zakupów może tę liczbę znacząco zmienić. Wgrajcie wyraźne zdjęcie paragonu jako dowód.'
WHERE id = 'a03b7e50-4c5f-4b9e-9faf-5a184612f73f';

UPDATE tasks SET reward_points = 200, description = 'Dobierz trzy produkty (pomarańczowy, gorzki, dziecięcy) za 15,50 zł w wiejskim sklepie. Im bliżej celu, tym więcej punktów. Wgraj zdjęcie paragonu.'
WHERE quest_id = 'a03b7e50-4c5f-4b9e-9faf-5a184612f73f';
