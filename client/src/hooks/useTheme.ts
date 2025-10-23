import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // Charger le thème depuis localStorage
    const savedSettings = localStorage.getItem('gbairai-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.theme) {
          setTheme(settings.theme);
          
          // Appliquer le thème immédiatement
          if (settings.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement du thème:', error);
      }
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Sauvegarder dans localStorage
    const savedSettings = localStorage.getItem('gbairai-settings');
    let settings = { theme: newTheme };
    
    if (savedSettings) {
      try {
        settings = { ...JSON.parse(savedSettings), theme: newTheme };
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du thème:', error);
      }
    }
    
    localStorage.setItem('gbairai-settings', JSON.stringify(settings));
    
    // Appliquer le thème
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return { theme, toggleTheme };
}