
import { MobileLayout } from "@/components/Common/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Heart, MapPin } from "lucide-react";
import { Link } from "wouter";

export default function AboutPage() {
  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-300 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
        <div className="space-y-6 p-4 pb-2 pt-24">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/profile">
              <Button variant="ghost" size="sm" className="text-gray-700 dark:text-gray-300">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">À propos de Gbairai</h1>
          </div>

          {/* App Info Card */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mx-auto mb-4">
                <img 
                  src="/Logotype.png" 
                  alt="Logo Gbairai" 
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-gray-600 dark:text-gray-400">Racont' ton Gbairai, on t'écoute sans te voir.</p>
            </CardHeader>
            <CardContent className="space-y-6 text-gray-700 dark:text-gray-300">
              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Notre Mission
                </h2>
                <p className="mb-4">
                  Gbairai est la première plateforme sociale dédiée à la Côte d'Ivoire, permettant aux Ivoiriens 
                  de partager leurs histoires, expériences et émotions de manière anonyme et géolocalisée. 
                  Notre mission est de créer un espace numérique authentique où chaque voix compte.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Qu'est-ce qu'un Gbairai ?</h2>
                <p className="mb-4">
                  Un "Gbairai" est une expression ivoirienne qui signifie "histoire" ou "nouvelle". 
                  Sur notre plateforme, c'est votre moyen de partager ce qui vous tient à cœur, 
                  vos expériences quotidiennes, vos joies, vos préoccupations - tout cela de manière anonyme.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Fonctionnalités</h2>
                <ul className="list-disc ml-6 space-y-2">
                  <li><strong>Publications anonymes :</strong> Partagez librement sans révéler votre identité</li>
                  <li><strong>Géolocalisation :</strong> Vos histoires sont associées à votre région</li>
                  <li><strong>Carte émotionnelle :</strong> Visualisez les émotions à travers la Côte d'Ivoire</li>
                  <li><strong>Analyse d'émotions IA :</strong> Intelligence artificielle pour comprendre les sentiments</li>
                  <li><strong>Communauté bienveillante :</strong> Espace modéré pour des échanges respectueux</li>
                  <li><strong>Interface en français :</strong> Application entièrement en français</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Vision</h2>
                <p>
                  Nous rêvons d'une Côte d'Ivoire plus connectée, où chaque citoyen peut s'exprimer librement 
                  et contribuer à une compréhension collective de notre société. Gbairai est notre contribution 
                  à la transformation numérique de notre pays.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Technologie</h2>
                <p>
                  Gbairai est une Progressive Web App (PWA) moderne, conçue pour fonctionner parfaitement 
                  sur tous les appareils, même avec une connexion internet limitée. Notre technologie 
                  respecte votre vie privée et garantit la sécurité de vos données.
                </p>
              </section>
            </CardContent>
          </Card>

          {/* Creator Info Card */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                Créateur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  KOUAME SOURALEH JATHE
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Développeur passionné et entrepreneur tech ivoirien, créateur de Gbairai.
                </p>
                <a 
                  href="https://www.linkedin.com/in/souraleh-jathe-ithiel-kouame-bab3322b8?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Voir le profil LinkedIn
                </a>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 italic text-center">
                  "Mon objectif avec Gbairai est de donner une voix numérique à chaque Ivoirien, 
                  de créer un espace où nos histoires peuvent être partagées et entendues, 
                  contribuant ainsi à tisser les liens de notre communauté."
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Card */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Contact & Support</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <strong className="text-gray-900 dark:text-white">Email :</strong>
                  <a href="mailto:gbairai.app@gmail.com" className="ml-2 text-blue-600 dark:text-blue-400 hover:underline">
                    gbairai.app@gmail.com
                  </a>
                </div>
                <div>
                  <strong className="text-gray-900 dark:text-white">Version :</strong>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">1.0.0 Beta</span>
                </div>
                <div>
                  <strong className="text-gray-900 dark:text-white">Dernière mise à jour :</strong>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">{new Date().toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 pb-4">
            <p>Fait avec ❤️ en Côte d'Ivoire</p>
            <p className="mt-1">© 2025 Gbairai - Tous droits réservés</p>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
