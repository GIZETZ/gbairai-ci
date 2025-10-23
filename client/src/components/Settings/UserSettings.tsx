import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Moon, 
  Sun, 
  Type, 
  Languages, 
  Save, 
  ArrowLeft,
  Settings,
  Palette
} from "lucide-react";

interface UserSettingsProps {
  onBack: () => void;
}

interface AppSettings {
  theme: 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large';
  recognitionLanguage: 'french' | 'english';
}

const defaultSettings: AppSettings = {
  theme: 'light',
  fontSize: 'medium',
  recognitionLanguage: 'french'
};

export function UserSettings({ onBack }: UserSettingsProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);

  // Charger les paramètres depuis le localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('gbairai-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error);
      }
    }
  }, []);

  // Mettre à jour les paramètres
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Sauvegarder les paramètres
  const saveSettings = () => {
    try {
      localStorage.setItem('gbairai-settings', JSON.stringify(settings));
      
      // Appliquer le thème immédiatement
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      setHasChanges(false);
      toast({
        title: "Paramètres sauvegardés",
        description: "Vos préférences ont été mises à jour avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    }
  };

  const getFontSizeLabel = (size: string) => {
    switch (size) {
      case 'small': return 'Petit';
      case 'medium': return 'Moyen';
      case 'large': return 'Grand';
      default: return 'Moyen';
    }
  };

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'french': return 'Français';
      case 'english': return 'Anglais';
      default: return 'Français';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Personnalisez votre expérience Gbairai
          </p>
        </div>
      </div>

      {/* Apparence */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Palette className="h-5 w-5" />
            Apparence
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ajustez l'apparence de l'application
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode sombre */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.theme === 'dark' ? (
                <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              )}
              <div>
                <Label className="text-sm font-medium text-gray-900 dark:text-white">
                  Mode sombre
                </Label>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Basculer entre le thème clair et sombre
                </p>
              </div>
            </div>
            <Switch
              checked={settings.theme === 'dark'}
              onCheckedChange={(checked) => updateSetting('theme', checked ? 'dark' : 'light')}
              className={`
                bg-black border border-white
                data-[state=checked]:bg-yellow-400
                transition-colors duration-300
              `}
            />
          </div>

          <Separator className="bg-gray-200 dark:bg-gray-700" />

          {/* Taille du texte */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Type className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <div>
                <Label className="text-sm font-medium text-gray-900 dark:text-white">
                  Taille du texte
                </Label>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {getFontSizeLabel(settings.fontSize)}
                </p>
              </div>
            </div>
            <Select
              value={settings.fontSize}
              onValueChange={(value: 'small' | 'medium' | 'large') => updateSetting('fontSize', value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Petit</SelectItem>
                <SelectItem value="medium">Moyen</SelectItem>
                <SelectItem value="large">Grand</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Langue */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Languages className="h-5 w-5" />
            Langue de l'interface
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {getLanguageLabel(settings.recognitionLanguage)}
          </p>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.recognitionLanguage}
            onValueChange={(value: 'french' | 'english') => updateSetting('recognitionLanguage', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="french">Français</SelectItem>
              <SelectItem value="english">Anglais</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Configuration actuelle */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">Configuration actuelle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700 dark:text-blue-300">Mode:</span>
              <span className="ml-2 text-blue-900 dark:text-blue-100">
                {settings.theme === 'dark' ? 'Sombre' : 'Clair'}
              </span>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300">Texte:</span>
              <span className="ml-2 text-blue-900 dark:text-blue-100">
                {getFontSizeLabel(settings.fontSize)}
              </span>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300">Langue:</span>
              <span className="ml-2 text-blue-900 dark:text-blue-100">
                {getLanguageLabel(settings.recognitionLanguage)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          onClick={saveSettings}
          disabled={!hasChanges}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          Sauvegarder les paramètres
        </Button>
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
        >
          Retour au profil
        </Button>
      </div>

      {/* Note */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Note :</strong> Les paramètres sont sauvegardés localement sur votre appareil. 
          Ils seront conservés même après fermeture de l'application.
        </p>
      </div>
    </div>
  );
}