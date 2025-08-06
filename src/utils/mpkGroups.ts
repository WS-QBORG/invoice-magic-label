/**
 * Separate MPK and Group definitions for independent selection
 */

export interface MPKOption {
  code: string;
  name: string;
  description: string;
}

export interface GroupOption {
  code: string;
  name: string;
  description: string;
}

/**
 * Available MPK codes
 */
export const MPK_OPTIONS: MPKOption[] = [
  // Montaż
  { code: 'MPK100', name: 'Montaż ogólne', description: 'Montaż - Montaż ogólne' },
  { code: 'MPK110', name: 'Montaż pomp ciepła', description: 'Montaż - Montaż pomp ciepła' },
  { code: 'MPK120', name: 'Instalacje wod-kan', description: 'Montaż - Instalacje wod-kan' },
  { code: 'MPK121', name: 'Zmiękczacz', description: 'Montaż - Zmiękczacz' },
  { code: 'mpk122', name: 'Prace ziemne', description: 'Montaż - Prace ziemne' },
  { code: 'MPK130', name: 'Ogrzewanie podłogowe', description: 'Montaż - Ogrzewanie podłogowe' },
  { code: 'MPK131', name: 'Centralne ogrzewanie', description: 'Montaż - Centralne ogrzewanie' },
  { code: 'MPK132', name: 'Montaż grzejników', description: 'Montaż - Montaż grzejników' },
  { code: 'MPK140', name: 'Rekuperacje', description: 'Montaż - Rekuperacje' },
  { code: 'MPK150', name: 'Pompy dużych mocy', description: 'Montaż - Pompy dużych mocy' },
  { code: 'MPK160', name: 'Audyty energetyczne', description: 'Montaż - Audyty energetyczne' },
  { code: 'MPK170', name: 'Montaż kotłów i instalacje w mieszkaniach', description: 'Montaż - Montaż kotłów i instalacje w mieszkaniach' },
  { code: 'MPK180', name: 'Prace dodatkowe', description: 'Montaż - Prace dodatkowe' },
  { code: 'MPK190', name: 'Reklamacje', description: 'Montaż - Reklamacje' },
  { code: 'MPK191', name: 'Klimatyzacje', description: 'Montaż - Klimatyzacje' },
  { code: 'MPK 192', name: 'Instalacje wod-kan na dużych obiektach', description: 'Montaż - Instalacje wod-kan na dużych obiektach' },
  { code: 'MPK 193', name: 'Fotowoltaika', description: 'Montaż - Fotowoltaika' },
  { code: 'MPK 194', name: 'Instalacji podposadzkowych', description: 'Montaż - Instalacji podposadzkowych' },
  { code: 'MPK 195', name: 'Chłodni', description: 'Montaż - Chłodni' },
  { code: 'MPK 196', name: 'Usterki spółki', description: 'Montaż - Usterki spółki' },
  { code: 'MPK 197', name: 'Wnioski', description: 'Montaż - Wnioski' },
  { code: 'MPK 198', name: 'Kotły na paliwa stałe', description: 'Montaż - Kotły na paliwa stałe' },
  { code: 'MPK 199', name: 'Kotły zewnętrzne', description: 'Montaż - Kotły zewnętrzne' },

  // Serwis
  { code: 'MPK200', name: 'Serwis ogólny', description: 'Serwis - Serwis ogólny' },
  { code: 'MPK210', name: 'Przegląd pomp', description: 'Serwis - Przegląd pomp' },
  { code: 'MPK220', name: 'Przegląd kotłów', description: 'Serwis - Przegląd kotłów' },
  { code: 'MPK230', name: 'Inne przeglądy', description: 'Serwis - Inne przeglądy' },
  { code: 'MPK240', name: 'Naprawa pomp', description: 'Serwis - Naprawa pomp' },
  { code: 'MPK250', name: 'Naprawa kotłów', description: 'Serwis - Naprawa kotłów' },
  { code: 'MPK260', name: 'Inne naprawy', description: 'Serwis - Inne naprawy' },

  // Inne
  { code: 'MPK300', name: 'Inne ogólne', description: 'Inne - Inne ogólne' },
  { code: 'MPK310', name: 'Koparka', description: 'Inne - Koparka' },
  { code: 'MPK320', name: 'Pozostałe', description: 'Inne - Pozostałe' },
  { code: 'MPK330', name: 'Fotowoltaika', description: 'Inne - Fotowoltaika' },

  // Operacyjne
  { code: 'MPK410', name: 'Operacyjne - zajęte przez księgowość', description: 'Operacyjne - Operacyjne - zajęte przez księgowość' },

  // Administracyjne
  { code: 'MPK510', name: 'Administracyjne', description: 'Administracyjne - Administracyjne' },

  // Pojazdy
  { code: 'MPK610', name: 'Audi A3', description: 'Pojazdy - Audi A3' },
  { code: 'MPK611', name: 'Citroen Jumper', description: 'Pojazdy - Citroen Jumper (Montaż)' },
  { code: 'MPK612', name: 'Ford Transit 2017', description: 'Pojazdy - Ford Transit 2017 (Montaż)' },
  { code: 'MPK613', name: 'Hyundai I20', description: 'Pojazdy - Hyundai I20 (Optymalizacja)' },
  { code: 'MPK614', name: 'Koparka', description: 'Pojazdy - Koparka (Prace ziemne)' },
  { code: 'MPK615', name: 'Master', description: 'Pojazdy - Master (Montaż)' },
  { code: 'MPK616', name: 'Ford Transit 2022', description: 'Pojazdy - Ford Transit 2022 (Serwis)' },
  { code: 'MPK617', name: 'Skoda Octavia', description: 'Pojazdy - Skoda Octavia' },
  { code: 'MPK618', name: 'TIPO', description: 'Pojazdy - TIPO (Montaż)' },
  { code: 'MPK619', name: 'CLIO', description: 'Pojazdy - CLIO (Montaż)' },
  { code: 'MPK620', name: 'YARIS', description: 'Pojazdy - YARIS (Montaż)' },
  { code: 'MPK621', name: 'Peugeot Partner', description: 'Pojazdy - Peugeot Partner (Montaż)' },
  { code: 'MPK622', name: 'Citroen Berlingo', description: 'Pojazdy - Citroen Berlingo (Montaż)' },
  { code: 'MPK623', name: 'Ford F-150', description: 'Pojazdy - Ford F-150 (Montaż)' },

  // Sprzedaż
  { code: 'MPK700', name: 'Sprzedaż ogólnie', description: 'Sprzedaż - Sprzedaż ogólnie' },

  // Optymalizacja
  { code: 'MPK800', name: 'Optymalizacja', description: 'Optymalizacja - Optymalizacja' },

  // Kurów
  { code: 'MPK900', name: 'Inwestycja Kurów - bieżące', description: 'Kurów - Inwestycja Kurów - bieżące' },
  { code: 'MPK901', name: 'Inwestycja Kurów - INWESTYCYJNE', description: 'Kurów - Inwestycja Kurów - INWESTYCYJNE' }
];

/**
 * Available Group codes
 */
export const GROUP_OPTIONS: GroupOption[] = [
  // Administracja (Group 1)
  { code: '1/1', name: 'Materiały biurowe', description: 'Administracja - Materiały biurowe' },
  { code: '1/2', name: 'Urządzenia techniczne', description: 'Administracja - Urządzenia techniczne' },
  { code: '1/3', name: 'Meble biurowe', description: 'Administracja - Meble biurowe' },
  { code: '1/4', name: 'Usługi zewnętrzne', description: 'Administracja - Usługi zewnętrzne' },
  { code: '1/5', name: 'Inne', description: 'Administracja - Inne' },
  { code: '1/6', name: 'Wynagrodzenie', description: 'Administracja - Wynagrodzenie' },
  { code: '1/7', name: 'ZUS', description: 'Administracja - ZUS' },
  { code: '1/8', name: 'PIT-R4', description: 'Administracja - PIT-R4' },
  { code: '1/9', name: 'Opłata bankowa', description: 'Administracja - Opłata bankowa' },
  { code: '1/10', name: 'Usługa informatyczna', description: 'Administracja - Usługa informatyczna' },
  { code: '1/11', name: 'Księgowość', description: 'Administracja - Księgowość' },
  { code: '1/12', name: 'Wynajem', description: 'Administracja - Wynajem' },
  { code: '1/13', name: 'Programy administracyjne', description: 'Administracja - Programy administracyjne' },
  { code: '1/14', name: 'Ubranie robocze', description: 'Administracja - Ubranie robocze' },
  { code: '1/15', name: 'Delegacja', description: 'Administracja - Delegacja' },
  { code: '1/16', name: 'Składki', description: 'Administracja - Składki' },
  { code: '1/17', name: 'Toaleta', description: 'Administracja - Toaleta' },
  { code: '1/18', name: 'Admin-biuro', description: 'Administracja - Admin-biuro' },
  { code: '1/19', name: 'Gruz', description: 'Administracja - Gruz' },
  { code: '1/20', name: 'Badania', description: 'Administracja - Badania' },
  { code: '1/21', name: 'Zakupy spożywcze', description: 'Administracja - Zakupy spożywcze' },
  { code: '1/22', name: 'Wysyłka przesyłek', description: 'Administracja - Wysyłka przesyłek' },
  { code: '1/23', name: 'Porada prawna', description: 'Administracja - Porada prawna' },
  { code: '1/24', name: 'Konsultacja', description: 'Administracja - Konsultacja' },
  { code: '1/25', name: 'Certyfikat', description: 'Administracja - Certyfikat' },
  { code: '1/26', name: 'Projektant', description: 'Administracja - Projektant' },
  { code: '1/27', name: 'Wydruki, pieczątki, wizytówki', description: 'Administracja - Wydruki, pieczątki, wizytówki' },
  { code: '1/28', name: 'Usługa gastronomiczna', description: 'Administracja - Usługa gastronomiczna' },
  { code: '1/29', name: 'Catering/obiady/', description: 'Administracja - Catering/obiady/' },
  { code: '1/30', name: 'Badania', description: 'Administracja - Badania' },
  { code: '1/31', name: 'Wynajem pow mag', description: 'Administracja - Wynajem pow mag' },
  { code: '1/32', name: 'Doradztwo', description: 'Administracja - Doradztwo' },
  { code: '1/33', name: 'PCC', description: 'Administracja - PCC' },
  { code: '1/34', name: 'Polisa', description: 'Administracja - Polisa' },
  { code: '1/35', name: 'Kontener', description: 'Administracja - Kontener' },
  { code: '1/36', name: 'Zachęta', description: 'Administracja - Zachęta' },
  { code: '1/37', name: 'Poszukiwanie pracownika', description: 'Administracja - Poszukiwanie pracownika' },
  { code: '1/38', name: 'Energia elektryczna', description: 'Administracja - Energia elektryczna' },
  { code: '1/39', name: 'Woda', description: 'Administracja - Woda' },
  { code: '1/40', name: 'Pozostałe media', description: 'Administracja - Pozostałe media' },
  { code: '1/41', name: 'Telekomunikacja', description: 'Administracja - Telekomunikacja' },
  { code: '1/42', name: 'Szkolenie', description: 'Administracja - Szkolenie' },
  { code: '1/43', name: 'Utrzymanie czystości', description: 'Administracja - Utrzymanie czystości' },
  { code: '1/44', name: 'Prezenty', description: 'Administracja - Prezenty' },
  { code: '1/45', name: 'Podatek od nieruchomości', description: 'Administracja - Podatek od nieruchomości' },

  // Inne (Group 2)
  { code: '2/1', name: 'Piotr', description: 'Inne - Piotr' },
  { code: '2/2', name: 'Tomasz', description: 'Inne - Tomasz' },
  { code: '2/3', name: 'Marcin', description: 'Inne - Marcin' },
  { code: '2/4', name: 'Inne', description: 'Inne - Inne' },

  // Magazyn (Group 3)
  { code: '3/1', name: 'Sprzęt', description: 'Magazyn - Sprzęt' },
  { code: '3/2', name: 'Wyposażenie', description: 'Magazyn - Wyposażenie' },
  { code: '3/3', name: 'Naprawa', description: 'Magazyn - Naprawa' },

  // Marketing (Group 4)
  { code: '4/1', name: 'Materiały reklamowe', description: 'Marketing - Materiały reklamowe' },
  { code: '4/2', name: 'Reklama w internecie', description: 'Marketing - Reklama w internecie' },
  { code: '4/3', name: 'Inne', description: 'Marketing - Inne' },
  { code: '4/4', name: 'Media społecznościowe', description: 'Marketing - Media społecznościowe' },
  { code: '4/5', name: 'Wystawienie artykułów', description: 'Marketing - Wystawienie artykułów' },
  { code: '4/6', name: 'Warsztat', description: 'Marketing - Warsztat' },
  { code: '4/7', name: 'Branding', description: 'Marketing - Branding' },
  { code: '4/8', name: 'Sponsoring', description: 'Marketing - Sponsoring' },
  { code: '4/9', name: 'Wyposażenie', description: 'Marketing - Wyposażenie' },
  { code: '4/10', name: 'Strona www', description: 'Marketing - Strona www' },
  { code: '4/11', name: 'Targi', description: 'Marketing - Targi' },
  { code: '4/12', name: 'Imprezy firmowe', description: 'Marketing - Imprezy firmowe' },
  { code: '4/13', name: 'Leady', description: 'Marketing - Leady' },
  { code: '4/14', name: 'Oferteo', description: 'Marketing - Oferteo' },

  // Operacyjne (Group 5)
  { code: '5/1', name: 'Materiał podstawowy', description: 'Operacyjne - Materiał podstawowy' },
  { code: '5/2', name: 'Materiał pomocniczy', description: 'Operacyjne - Materiał pomocniczy' },
  { code: '5/3', name: 'Inne', description: 'Operacyjne - Inne' },
  { code: '5/4', name: 'Transport', description: 'Operacyjne - Transport' },
  { code: '5/5', name: 'Usługa montażu - tylko podwykonawcy', description: 'Operacyjne - Usługa montażu - tylko podwykonawcy' },
  { code: '5/6', name: 'Marża', description: 'Operacyjne - Marża' },
  { code: '5/7', name: 'Obce środki trwałe', description: 'Operacyjne - Obce środki trwałe' },
  { code: '5/8', name: 'Obciążenie', description: 'Operacyjne - Obciążenie' },
  { code: '5/9', name: 'Korekta', description: 'Operacyjne - Korekta' },
  { code: '5/10', name: 'Polecenie klienta', description: 'Operacyjne - Polecenie klienta' },
  { code: '5/11', name: 'Prace ziemne', description: 'Operacyjne - Prace ziemne' },
  { code: '5/12', name: 'Sprzedaż materiałów', description: 'Operacyjne - Sprzedaż materiałów' },
  { code: '5/13', name: 'Badanie jakości wody', description: 'Operacyjne - Badanie jakości wody' },
  { code: '5/14', name: 'Wyceny, kosztorysy', description: 'Operacyjne - Wyceny, kosztorysy' },
  { code: '5/15', name: 'Wynagrodzenie pracowników terenowych', description: 'Operacyjne - Wynagrodzenie pracowników terenowych' },

  // Reprezentacja (Group 6)
  { code: '6/1', name: 'Reprezentacyjne', description: 'Reprezentacja - Reprezentacyjne' },

  // Transport (Group 7)
  { code: '7/1', name: 'Leasing', description: 'Transport - Leasing' },
  { code: '7/2', name: 'Paliwo', description: 'Transport - Paliwo' },
  { code: '7/3', name: 'Zakupy', description: 'Transport - Zakupy' },
  { code: '7/4', name: 'Przegląd', description: 'Transport - Przegląd' },
  { code: '7/5', name: 'Wynajem', description: 'Transport - Wynajem' },
  { code: '7/6', name: 'Przejazd autostradą', description: 'Transport - Przejazd autostradą' },
  { code: '7/7', name: 'Olej', description: 'Transport - Olej' },
  { code: '7/8', name: 'Opony', description: 'Transport - Opony' },
  { code: '7/9', name: 'Parkowanie', description: 'Transport - Parkowanie' },
  { code: '7/10', name: 'GPS', description: 'Transport - GPS' },
  { code: '7/11', name: 'Ubezpieczenie', description: 'Transport - Ubezpieczenie' },
  { code: '7/12', name: 'Polisa', description: 'Transport - Polisa' },
  { code: '7/13', name: 'Wynajęty', description: 'Transport - Wynajęty' },
  { code: '7/14', name: 'Rejestracja', description: 'Transport - Rejestracja' },
  { code: '7/15', name: 'Zajęte przez księgowość', description: 'Transport - Zajęte przez księgowość' },
  { code: '7/16', name: 'Myjnia', description: 'Transport - Myjnia' },
  { code: '7/17', name: 'Naprawa', description: 'Transport - Naprawa' },

  // Wyposażenie (Group 8)
  { code: '8/1', name: 'Band', description: 'Wyposażenie - Band' },
  { code: '8/2', name: 'Laptop', description: 'Wyposażenie - Laptop' },
  { code: '8/3', name: 'Monitor', description: 'Wyposażenie - Monitor' },
  { code: '8/4', name: 'Etui', description: 'Wyposażenie - Etui' },
  { code: '8/5', name: 'Telefon', description: 'Wyposażenie - Telefon' },
  { code: '8/6', name: 'Akcesoria', description: 'Wyposażenie - Akcesoria' },
  { code: '8/7', name: 'Tablet', description: 'Wyposażenie - Tablet' },
  { code: '8/8', name: 'Inne', description: 'Wyposażenie - Inne' },
  { code: '8/9', name: 'Kamera', description: 'Wyposażenie - Kamera' },
  { code: '8/10', name: 'Router', description: 'Wyposażenie - Router' },
  { code: '8/11', name: 'Serwis', description: 'Wyposażenie - Serwis' },
  { code: '8/12', name: 'Kasa fiskalna', description: 'Wyposażenie - Kasa fiskalna' },

  // Pozostałe (Group 9)
  { code: '9/1', name: 'Optymalizacja', description: 'Pozostałe - Optymalizacja' },
  { code: '9/2', name: 'Transfer między spółkami', description: 'Pozostałe - Transfer między spółkami' },
  { code: '9/3', name: 'Passerati', description: 'Pozostałe - Passerati (wyrzucane z kosztów do analizy a zostające w wyniku księgowym)' },

  // Narzędzia (Group 10)
  { code: '10/1', name: 'Wypożyczenie narzędzi', description: 'Narzędzia - Wypożyczenie narzędzi' },
  { code: '10/2', name: 'Zakup', description: 'Narzędzia - Zakup' },
  { code: '10/3', name: 'Naprawa', description: 'Narzędzia - Naprawa' }
];

/**
 * Get MPK option by code
 */
export function getMPKOption(code: string): MPKOption | undefined {
  return MPK_OPTIONS.find(mpk => mpk.code === code);
}

/**
 * Get Group option by code
 */
export function getGroupOption(code: string): GroupOption | undefined {
  return GROUP_OPTIONS.find(group => group.code === code);
}

/**
 * Get all MPK options
 */
export function getAllMPKOptions(): MPKOption[] {
  return MPK_OPTIONS;
}

/**
 * Get all Group options
 */
export function getAllGroupOptions(): GroupOption[] {
  return GROUP_OPTIONS;
}