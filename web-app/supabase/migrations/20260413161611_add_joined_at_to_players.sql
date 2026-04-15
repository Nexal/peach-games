-- Dodanie kolumny joined_at do players - pozwala sprawdzić kto już dołączył do gry
ALTER TABLE players ADD COLUMN joined_at TIMESTAMP WITH TIME ZONE;
