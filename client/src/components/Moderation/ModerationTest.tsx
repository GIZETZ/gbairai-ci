import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface ModerationResult {
  approved: boolean;
  reason?: string;
  foundWords?: string[];
  suggestion?: string;
}

export function ModerationTest() {
  const [content, setContent] = useState("");
  const [result, setResult] = useState<ModerationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testModeration = async () => {
    if (!content.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/moderate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Erreur test modération:", error);
      setResult({ approved: false, reason: "Erreur lors du test" });
    } finally {
      setIsLoading(false);
    }
  };

  const testExamples = [
    { label: "Contenu normal", text: "Salut les amis, comment ça va aujourd'hui ? Belle journée à Abidjan !" },
    { label: "Contenu avec mot interdit", text: "Salut les cons, comment ça va ?" },
    { label: "Contenu violent", text: "Je vais te tuer si tu continues" },
    { label: "Contenu haineux", text: "Je déteste cette communauté" },
    { label: "Nouchi respectueux", text: "Wesh mon reuf, ça va ou bien ?" },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Test de Modération de Contenu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Contenu à tester</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tapez votre message ici pour tester la modération..."
              className="min-h-[100px]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {testExamples.map((example, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setContent(example.text)}
              >
                {example.label}
              </Button>
            ))}
          </div>

          <Button
            onClick={testModeration}
            disabled={!content.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? "Test en cours..." : "Tester la modération"}
          </Button>

          {result && (
            <Card className={`border-2 ${result.approved ? "border-green-500" : "border-red-500"}`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  {result.approved ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-medium">
                    {result.approved ? "Contenu approuvé" : "Contenu bloqué"}
                  </span>
                </div>

                {!result.approved && (
                  <div className="space-y-2">
                    {result.reason && (
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Message:</p>
                          <p className="text-sm text-gray-600">{result.reason}</p>
                        </div>
                      </div>
                    )}

                    {result.foundWords && result.foundWords.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">Mots détectés:</p>
                        <div className="flex flex-wrap gap-1">
                          {result.foundWords.map((word, index) => (
                            <Badge key={index} variant="destructive" className="text-xs">
                              {word}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.suggestion && (
                      <div>
                        <p className="text-sm font-medium">Suggestion:</p>
                        <p className="text-sm text-gray-600">{result.suggestion}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Système de Modération Gbairai</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Modération en 2 étapes</p>
                <p className="text-gray-600">
                  1. Vérification rapide avec liste noire locale
                  <br />
                  2. Analyse IA avancée avec OpenRouter GPT-4o-mini
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Respecte la culture ivoirienne</p>
                <p className="text-gray-600">
                  Tolère le nouchi et l'argot local tant qu'il reste respectueux
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium">Messages de refus contextuels</p>
                <p className="text-gray-600">
                  Réponses dans le style ivoirien pour rester proche des utilisateurs
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}