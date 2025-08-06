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
  // Administracja MPK
  { code: 'MPK100', name: 'Materiały biurowe', description: 'Administracja - Materiały biurowe' },
  { code: 'MPK110', name: 'Urządzenia techniczne', description: 'Administracja - Urządzenia techniczne' },
  { code: 'MPK121', name: 'Usługi zewnętrzne', description: 'Administracja - Usługi zewnętrzne' },
  { code: 'MPK130', name: 'Nadzór/monitoring', description: 'Administracja - Nadzór/monitoring' },
  { code: 'MPK140', name: 'Obsługa klienta', description: 'Administracja - Obsługa klienta' },
  { code: 'MPK150', name: 'Zarządzanie', description: 'Administracja - Zarządzanie' },
  { code: 'MPK160', name: 'HR i rekrutacja', description: 'Administracja - HR i rekrutacja' },
  { code: 'MPK170', name: 'Prawne i compliance', description: 'Administracja - Prawne i compliance' },
  { code: 'MPK180', name: 'Finanse i księgowość', description: 'Administracja - Finanse i księgowość' },
  { code: 'MPK190', name: 'IT i systemy', description: 'Administracja - IT i systemy' },

  // Marketing MPK
  { code: 'MPK400', name: 'Reklama online', description: 'Marketing - Reklama online' },
  { code: 'MPK410', name: 'Reklama tradycyjna', description: 'Marketing - Reklama tradycyjna' },
  { code: 'MPK420', name: 'Events i promocje', description: 'Marketing - Events i promocje' },
  { code: 'MPK430', name: 'Materiały marketingowe', description: 'Marketing - Materiały marketingowe' },
  { code: 'MPK440', name: 'PR i media', description: 'Marketing - PR i media' },
  { code: 'MPK450', name: 'Badania rynku', description: 'Marketing - Badania rynku' },
  { code: 'MPK460', name: 'Branding', description: 'Marketing - Branding' },
  { code: 'MPK470', name: 'Content marketing', description: 'Marketing - Content marketing' },
  { code: 'MPK480', name: 'Social media', description: 'Marketing - Social media' },
  { code: 'MPK490', name: 'SEO/SEM', description: 'Marketing - SEO/SEM' },

  // Operacyjne MPK
  { code: 'MPK500', name: 'Surowce podstawowe', description: 'Operacyjne - Surowce podstawowe' },
  { code: 'MPK510', name: 'Materiały pomocnicze', description: 'Operacyjne - Materiały pomocnicze' },
  { code: 'MPK520', name: 'Energia i media', description: 'Operacyjne - Energia i media' },
  { code: 'MPK530', name: 'Konserwacja i naprawy', description: 'Operacyjne - Konserwacja i naprawy' },
  { code: 'MPK540', name: 'Kontrola jakości', description: 'Operacyjne - Kontrola jakości' },
  { code: 'MPK550', name: 'Bezpieczeństwo pracy', description: 'Operacyjne - Bezpieczeństwo pracy' },
  { code: 'MPK560', name: 'Logistyka wewnętrzna', description: 'Operacyjne - Logistyka wewnętrzna' },
  { code: 'MPK570', name: 'Magazynowanie', description: 'Operacyjne - Magazynowanie' },
  { code: 'MPK580', name: 'Produkcja', description: 'Operacyjne - Produkcja' },
  { code: 'MPK590', name: 'Optymalizacja procesów', description: 'Operacyjne - Optymalizacja procesów' },

  // Transport MPK  
  { code: 'MPK700', name: 'Paliwo', description: 'Transport - Paliwo' },
  { code: 'MPK710', name: 'Serwis pojazdów', description: 'Transport - Serwis pojazdów' },
  { code: 'MPK720', name: 'Części zamienne', description: 'Transport - Części zamienne' },
  { code: 'MPK730', name: 'Ubezpieczenia pojazdów', description: 'Transport - Ubezpieczenia pojazdów' },
  { code: 'MPK740', name: 'Opłaty drogowe', description: 'Transport - Opłaty drogowe' },
  { code: 'MPK750', name: 'Logistyka zewnętrzna', description: 'Transport - Logistyka zewnętrzna' },
  { code: 'MPK760', name: 'Flota pojazdów', description: 'Transport - Flota pojazdów' },
  { code: 'MPK770', name: 'GPS i tracking', description: 'Transport - GPS i tracking' },
  { code: 'MPK780', name: 'Kierowcy i personel', description: 'Transport - Kierowcy i personel' },
  { code: 'MPK790', name: 'Optymalizacja tras', description: 'Transport - Optymalizacja tras' },

  // Wyposażenie MPK
  { code: 'MPK800', name: 'Meble biurowe', description: 'Wyposażenie - Meble biurowe' },
  { code: 'MPK810', name: 'Sprzęt komputerowy', description: 'Wyposażenie - Sprzęt komputerowy' },
  { code: 'MPK820', name: 'Maszyny i urządzenia', description: 'Wyposażenie - Maszyny i urządzenia' },
  { code: 'MPK830', name: 'Narzędzia', description: 'Wyposażenie - Narzędzia' },
  { code: 'MPK840', name: 'Elektronika', description: 'Wyposażenie - Elektronika' },
  { code: 'MPK850', name: 'Oprogramowanie', description: 'Wyposażenie - Oprogramowanie' },
  { code: 'MPK860', name: 'Systemy bezpieczeństwa', description: 'Wyposażenie - Systemy bezpieczeństwa' },
  { code: 'MPK870', name: 'Klimatyzacja/ogrzewanie', description: 'Wyposażenie - Klimatyzacja/ogrzewanie' },
  { code: 'MPK880', name: 'Wyposażenie kuchni', description: 'Wyposażenie - Wyposażenie kuchni' },
  { code: 'MPK890', name: 'Sprzęt medyczny', description: 'Wyposażenie - Sprzęt medyczny' },

  // Pozostałe MPK
  { code: 'MPK900', name: 'Szkolenia', description: 'Pozostałe - Szkolenia' },
  { code: 'MPK910', name: 'Doradztwo', description: 'Pozostałe - Doradztwo' },
  { code: 'MPK920', name: 'Ubezpieczenia', description: 'Pozostałe - Ubezpieczenia' },
  { code: 'MPK930', name: 'Podróże służbowe', description: 'Pozostałe - Podróże służbowe' },
  { code: 'MPK940', name: 'Reprezentacja', description: 'Pozostałe - Reprezentacja' },
  { code: 'MPK950', name: 'Opłaty i składki', description: 'Pozostałe - Opłaty i składki' },
  { code: 'MPK960', name: 'Usługi bankowe', description: 'Pozostałe - Usługi bankowe' },
  { code: 'MPK970', name: 'Certyfikaty i licencje', description: 'Pozostałe - Certyfikaty i licencje' },
  { code: 'MPK980', name: 'Badania i rozwój', description: 'Pozostałe - Badania i rozwój' },
  { code: 'MPK990', name: 'Inne', description: 'Pozostałe - Inne' }
];

/**
 * Available Group codes
 */
export const GROUP_OPTIONS: GroupOption[] = [
  // Administracja (Group 1)
  { code: '1/1', name: 'Materiały biurowe', description: 'Administracja - Materiały i podstawowe zasoby biurowe' },
  { code: '1/2', name: 'Urządzenia techniczne', description: 'Administracja - Sprzęt i urządzenia techniczne' },
  { code: '1/3', name: 'Utrzymanie biura', description: 'Administracja - Utrzymanie i czystość biura' },
  { code: '1/4', name: 'Usługi zewnętrzne', description: 'Administracja - Outsourcing i usługi zewnętrzne' },
  { code: '1/5', name: 'Zarządzanie', description: 'Administracja - Zarządzanie i nadzór' },
  { code: '1/6', name: 'HR', description: 'Administracja - Zasoby ludzkie' },
  { code: '1/7', name: 'Finanse', description: 'Administracja - Finanse i księgowość' },
  { code: '1/8', name: 'IT', description: 'Administracja - Technologie informatyczne' },

  // Marketing (Group 4)
  { code: '4/1', name: 'Reklama cyfrowa', description: 'Marketing - Reklama online i cyfrowa' },
  { code: '4/2', name: 'Reklama tradycyjna', description: 'Marketing - Media tradycyjne' },
  { code: '4/3', name: 'Events', description: 'Marketing - Wydarzenia i promocje' },
  { code: '4/4', name: 'Materiały', description: 'Marketing - Materiały marketingowe' },
  { code: '4/5', name: 'PR', description: 'Marketing - Public Relations' },
  { code: '4/6', name: 'Badania', description: 'Marketing - Badania rynku' },
  { code: '4/7', name: 'Branding', description: 'Marketing - Marka i identyfikacja' },
  { code: '4/8', name: 'Digital', description: 'Marketing - Marketing cyfrowy' },

  // Operacyjne (Group 5)
  { code: '5/1', name: 'Surowce', description: 'Operacyjne - Surowce i materiały podstawowe' },
  { code: '5/2', name: 'Materiały pomocnicze', description: 'Operacyjne - Materiały wspomagające produkcję' },
  { code: '5/3', name: 'Energia', description: 'Operacyjne - Energia i media' },
  { code: '5/4', name: 'Konserwacja', description: 'Operacyjne - Konserwacja i naprawy' },
  { code: '5/5', name: 'Jakość', description: 'Operacyjne - Kontrola jakości' },
  { code: '5/6', name: 'BHP', description: 'Operacyjne - Bezpieczeństwo i higiena pracy' },
  { code: '5/7', name: 'Logistyka', description: 'Operacyjne - Logistyka wewnętrzna' },
  { code: '5/8', name: 'Produkcja', description: 'Operacyjne - Procesy produkcyjne' },

  // Transport (Group 7)
  { code: '7/1', name: 'Paliwo', description: 'Transport - Paliwo i oleje' },
  { code: '7/2', name: 'Serwis', description: 'Transport - Serwis i naprawa pojazdów' },
  { code: '7/3', name: 'Części', description: 'Transport - Części zamienne' },
  { code: '7/4', name: 'Ubezpieczenia', description: 'Transport - Ubezpieczenia pojazdów' },
  { code: '7/5', name: 'Opłaty', description: 'Transport - Opłaty drogowe i postojowe' },
  { code: '7/6', name: 'Logistyka zewnętrzna', description: 'Transport - Transport i dostawa' },
  { code: '7/7', name: 'Flota', description: 'Transport - Zarządzanie flotą' },
  { code: '7/8', name: 'Technologie', description: 'Transport - GPS, tracking, systemy' },

  // Wyposażenie (Group 8)
  { code: '8/1', name: 'Meble', description: 'Wyposażenie - Meble i wyposażenie biurowe' },
  { code: '8/2', name: 'Komputery', description: 'Wyposażenie - Sprzęt komputerowy' },
  { code: '8/3', name: 'Maszyny', description: 'Wyposażenie - Maszyny i urządzenia przemysłowe' },
  { code: '8/4', name: 'Narzędzia', description: 'Wyposażenie - Narzędzia i sprzęt' },
  { code: '8/5', name: 'Elektronika', description: 'Wyposażenie - Urządzenia elektroniczne' },
  { code: '8/6', name: 'Oprogramowanie', description: 'Wyposażenie - Licencje i oprogramowanie' },
  { code: '8/7', name: 'Bezpieczeństwo', description: 'Wyposażenie - Systemy bezpieczeństwa' },
  { code: '8/8', name: 'Infrastruktura', description: 'Wyposażenie - Infrastruktura techniczna' },

  // Pozostałe (Group 9)
  { code: '9/1', name: 'Szkolenia', description: 'Pozostałe - Szkolenia i kursy' },
  { code: '9/2', name: 'Doradztwo', description: 'Pozostałe - Usługi doradcze' },
  { code: '9/3', name: 'Ubezpieczenia', description: 'Pozostałe - Ubezpieczenia firmowe' },
  { code: '9/4', name: 'Podróże', description: 'Pozostałe - Podróże służbowe' },
  { code: '9/5', name: 'Reprezentacja', description: 'Pozostałe - Koszty reprezentacyjne' },
  { code: '9/6', name: 'Opłaty', description: 'Pozostałe - Opłaty administracyjne' },
  { code: '9/7', name: 'Usługi finansowe', description: 'Pozostałe - Bankowość i finanse' },
  { code: '9/8', name: 'Inne', description: 'Pozostałe - Pozostałe wydatki' }
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