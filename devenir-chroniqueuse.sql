-- Facultatif : donne le grade « chroniqueuse » à un compte (l'Espace Officier > Membres permet aussi de le faire sans SQL).
UPDATE membres SET grade = 'chroniqueuse' WHERE email = 'son@email.com';
