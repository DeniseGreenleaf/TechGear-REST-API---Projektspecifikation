
I det här projektet har jag försökt fokusera på att göra koden läsbar/överskådlig då min kod i inlämningsuppgiften i förra kursen var väldigt lång och blev till sist väldigt rörig och svår att arbeta med även om funktionen blev bra. 
Jag har försökt dela upp koden i flera olika filer samt använda mig av funktioner och querys som jag lagt i utils filen för att återanvända. Har du någon feedback på mappstruturen/uppdelningen och tydligheten? Är det logiskt uppdelat? hur lång ska man tänka att en fil ska vara? för referens var mitt förra projekt ungefär 500 rader (efter att jag försökt korta ner det) så det här känns som en förbättring. 

i min databas är de flesta relationer one to many, jag har två kopplingstabeller med many to many relationer. Den jag tänker att jag skulle kunna ta bort är products-manufacturers eftersom produkter oftast har en tillverkare. dock låter jag den vara kvar då teoretiskt sett skulle en produkt kunna ha flera tillverkare (exempelvis vid samarbetsprodukter ex. Samsung/Google Nexus-telefoner eller en dator med Intel CPU och NVIDIA grafikkort osv.) även om jag vet att det kanske inte tillhör standard.. 

VG - 
Felhanteringen och valideringen har jag generellt tänkt Specifika och relevanta http status koder och anpassade felmeddelanden som är tydliga och detaljerade som beskriver exakt vad som har gått fel. Samt använda try-catch genomgående. 
Med pagineringen har jag försökt tänka på vilken information som är relevant/ kan hjälpa frontend exempelvis hasNexPage/PreviousPage för att visa/dölja navigeringspilar. 