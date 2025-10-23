
import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { clientEmailService } from "@/services/emailService";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailValidation, setEmailValidation] = useState({
    isValid: false,
    isValidating: false,
    message: ""
  });

  const validateEmail = async (emailValue: string) => {
    if (!emailValue || emailValue.length < 3) {
      setEmailValidation({
        isValid: false,
        isValidating: false,
        message: ""
      });
      return;
    }

    setEmailValidation(prev => ({
      ...prev,
      isValidating: true,
      message: "Vérification..."
    }));

    try {
      const response = await fetch('/api/validate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue })
      });

      const result = await response.json();

      setEmailValidation({
        isValid: result.isValid,
        isValidating: false,
        message: result.isValid ? "Email valide" : result.issues?.join(", ") || "Email invalide"
      });
    } catch (error) {
      setEmailValidation({
        isValid: false,
        isValidating: false,
        message: "Erreur lors de la validation"
      });
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    
    // Debounce la validation
    setTimeout(() => {
      validateEmail(value);
    }, 500);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValidation.isValid) return;

    setLoading(true);
    try {
      const response = await fetch('/api/password/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        // Envoyer le code via notre service email
        await clientEmailService.sendVerificationCode(email, 'password_reset');
        setStep('code');
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de la demande de réinitialisation');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la demande de réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) return;

    // Le backend vérifie le code et met à jour le mot de passe dans le même endpoint.
    // On passe simplement à l'étape de saisie du nouveau mot de passe ici.
    setStep('password');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/password/reset-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code,
          newPassword
        })
      });

      if (response.ok) {
        alert('Mot de passe modifié avec succès !');
        setLocation('/auth');
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de la modification du mot de passe');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la modification du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-300 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/auth')}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center">
              <div className="w-10 h-10 mr-3">
                <img 
                  src="/logo.png" 
                  alt="Logo Gbairai" 
                  className="w-full h-full object-contain"
                />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Réinitialiser le mot de passe
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold mb-2">
                  Entrez votre adresse email
                </h3>
                <p className="text-gray-600 text-sm">
                  Un code de vérification sera envoyé à votre adresse email
                </p>
              </div>

              <div>
                <Label htmlFor="email">Adresse email</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className={`pr-10 ${
                      email && !emailValidation.isValidating
                        ? emailValidation.isValid
                          ? 'border-green-500'
                          : 'border-red-500'
                        : ''
                    }`}
                    required
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {emailValidation.isValidating ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : email && emailValidation.message ? (
                      emailValidation.isValid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )
                    ) : null}
                  </div>
                </div>
                {email && emailValidation.message && (
                  <p className={`text-sm mt-1 ${
                    emailValidation.isValid ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {emailValidation.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-ivorian-orange hover:bg-orange-600"
                disabled={loading || !emailValidation.isValid}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  "Envoyer le code"
                )}
              </Button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold mb-2">
                  Vérification par email
                </h3>
                <p className="text-gray-600 text-sm">
                  Un code de vérification a été envoyé à<br />
                  <strong>{email}</strong>
                </p>
              </div>

              <div>
                <Label htmlFor="code">Code de vérification</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg font-mono"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-ivorian-orange hover:bg-orange-600"
                disabled={loading || code.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  "Vérifier le code"
                )}
              </Button>

              <Button 
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setStep('email')}
              >
                Retour
              </Button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold mb-2">
                  Nouveau mot de passe
                </h3>
                <p className="text-gray-600 text-sm">
                  Choisissez un nouveau mot de passe sécurisé
                </p>
              </div>

              <div>
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div>
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className={confirmPassword && newPassword !== confirmPassword ? 'border-red-500' : ''}
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-red-600 text-sm mt-1">
                    Les mots de passe ne correspondent pas
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-ivorian-orange hover:bg-orange-600"
                disabled={loading || newPassword !== confirmPassword || newPassword.length < 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Modification...
                  </>
                ) : (
                  "Modifier le mot de passe"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
