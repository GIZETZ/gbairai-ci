import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

createRoot(document.getElementById("root")!).render(<App />);

// Enregistrer le service worker
serviceWorkerRegistration.register({
  onSuccess: (registration) => {
    console.log('SW enregistré avec succès:', registration);
  },
  onUpdate: (registration) => {
    console.log('SW mis à jour:', registration);
    // Optionnel: afficher une notification de mise à jour
    if (confirm('Une nouvelle version est disponible. Recharger ?')) {
      window.location.reload();
    }
  }
});

// Demander permission notifications
serviceWorkerRegistration.requestNotificationPermission().then(permission => {
  if (permission === 'granted') {
    console.log('Permission notifications accordée');
  }
});
