
import { MobileLayout } from "@/components/Common/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function PrivacyPolicyPage() {
  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-300 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
        <div className="space-y-6 p-4 pt-24 pb-24">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/profile">
              <Button variant="ghost" size="sm" className="text-gray-700 dark:text-gray-300">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Politique de Confidentialité</h1>
          </div>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Politique de Confidentialité de Gbairai</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
            </CardHeader>
            <CardContent className="space-y-6 text-gray-700 dark:text-gray-300">
              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">1. Introduction</h2>
                <p className="mb-4">
                  Bienvenue sur Gbairai, votre plateforme de partage d'histoires anonymes géolocalisées en Côte d'Ivoire. 
                  Nous respectons votre vie privée et nous nous engageons à protéger vos données personnelles. 
                  Cette politique de confidentialité explique comment nous collectons, utilisons, stockons et protégeons vos informations.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">2. Informations que nous collectons</h2>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium mb-2">2.1 Informations d'inscription</h3>
                    <p>Lors de votre inscription, nous collectons votre nom d'utilisateur, adresse e-mail et mot de passe crypté.</p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">2.2 Contenu utilisateur</h3>
                    <p>Vos publications (Gbairais), commentaires, réactions et interactions sur la plateforme.</p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">2.3 Données de localisation</h3>
                    <p>Informations de géolocalisation approximative pour associer vos publications à des régions de Côte d'Ivoire.</p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">2.4 Données techniques</h3>
                    <p>Adresse IP, type de navigateur, système d'exploitation, données de session et cookies.</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">3. Comment nous utilisons vos informations</h2>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Fournir et maintenir nos services</li>
                  <li>Authentifier votre identité et sécuriser votre compte</li>
                  <li>Afficher vos publications sur la carte interactive</li>
                  <li>Faciliter les interactions entre utilisateurs</li>
                  <li>Modérer le contenu et prévenir les abus</li>
                  <li>Envoyer des notifications importantes</li>
                  <li>Analyser les tendances d'utilisation pour améliorer l'expérience</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">4. Partage d'informations</h2>
                <p className="mb-4">
                  Nous ne vendons jamais vos données personnelles. Nous pouvons partager vos informations uniquement dans les cas suivants :
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Avec votre consentement explicite</li>
                  <li>Pour se conformer aux obligations légales</li>
                  <li>Pour protéger nos droits et la sécurité de nos utilisateurs</li>
                  <li>Avec des prestataires de services de confiance (hébergement, analyse)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">5. Sécurité des données</h2>
                <p>
                  Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données contre 
                  l'accès non autorisé, la modification, la divulgation ou la destruction. Cela inclut le cryptage, 
                  les pare-feu, l'authentification sécurisée et la surveillance continue.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">6. Conservation des données</h2>
                <p>
                  Nous conservons vos données personnelles aussi longtemps que nécessaire pour fournir nos services 
                  ou respecter nos obligations légales. Vous pouvez demander la suppression de votre compte à tout moment.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">7. Vos droits</h2>
                <p className="mb-4">Vous avez le droit de :</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Accéder à vos données personnelles</li>
                  <li>Corriger ou mettre à jour vos informations</li>
                  <li>Supprimer votre compte et vos données</li>
                  <li>Limiter le traitement de vos données</li>
                  <li>Vous opposer au traitement de vos données</li>
                  <li>Portabilité de vos données</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">8. Cookies et technologies similaires</h2>
                <p>
                  Nous utilisons des cookies pour améliorer votre expérience, maintenir votre session 
                  et analyser l'utilisation de notre plateforme. Vous pouvez gérer vos préférences de cookies 
                  dans les paramètres de votre navigateur.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">9. Services tiers</h2>
                <p>
                  Notre application peut contenir des liens vers des sites tiers. Nous ne sommes pas responsables 
                  des pratiques de confidentialité de ces sites externes.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">10. Modifications de cette politique</h2>
                <p>
                  Nous pouvons mettre à jour cette politique de confidentialité de temps à autre. 
                  Les modifications importantes vous seront notifiées via l'application ou par e-mail.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">11. Amélioration de nos services</h2>
                <p className="mb-4">
                  Dans le cadre de notre engagement à fournir la meilleure expérience possible, nous analysons 
                  de manière anonymisée les données d'utilisation pour :
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Optimiser les performances de l'application</li>
                  <li>Identifier les fonctionnalités les plus appréciées</li>
                  <li>Détecter et corriger les bugs</li>
                  <li>Améliorer l'algorithme de recommandation de contenu</li>
                  <li>Développer de nouvelles fonctionnalités basées sur vos besoins</li>
                  <li>Garantir la sécurité et prévenir les activités malveillantes</li>
                  <li>Personnaliser votre expérience tout en respectant votre anonymat</li>
                </ul>
                <p className="mt-4 text-sm">
                  Ces analyses sont effectuées de manière à préserver votre vie privée et ne permettent 
                  jamais de vous identifier personnellement. Les données agrégées nous aident à prendre 
                  des décisions éclairées pour l'évolution de Gbairai.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">12. Contact</h2>
                <p>
                  Pour toute question concernant cette politique de confidentialité ou vos données personnelles, 
                  contactez-nous à : <a href="mailto:gbairai.app@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">gbairai.app@gmail.com</a>
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
    </MobileLayout>
  );
}
