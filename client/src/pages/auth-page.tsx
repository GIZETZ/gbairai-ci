import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { emotionApi } from "@/services/api";
import { clientEmailService } from "@/services/emailService";
import { LoadingPage } from "@/components/Common/LoadingPage";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ 
    username: "", 
    email: "", 
    password: "" 
  });
  const [verificationStep, setVerificationStep] = useState<{
    type: 'login' | 'register' | null;
    email: string;
  }>({ type: null, email: "" });
  const [verificationCode, setVerificationCode] = useState("");
  const [showLoadingPage, setShowLoadingPage] = useState(false);
  const [emailValidation, setEmailValidation] = useState({
    login: { isValid: false, isValidating: false, message: "" },
    register: { isValid: false, isValidating: false, message: "" }
  });

  // Rediriger si l'utilisateur est déjà connecté
  React.useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const validateEmail = async (email: string, type: 'login' | 'register') => {
    if (!email || email.length < 3) {
      setEmailValidation(prev => ({
        ...prev,
        [type]: { isValid: false, isValidating: false, message: "" }
      }));
      return;
    }

    setEmailValidation(prev => ({
      ...prev,
      [type]: { isValid: false, isValidating: true, message: "Vérification..." }
    }));

    try {
      const result = await emotionApi.validateEmail(email);

      setEmailValidation(prev => ({
        ...prev,
        [type]: {
          isValid: result.isValid,
          isValidating: false,
          message: result.isValid ? "Email valide" : result.issues.join(", ")
        }
      }));
    } catch (error) {
      setEmailValidation(prev => ({
        ...prev,
        [type]: {
          isValid: false,
          isValidating: false,
          message: "Erreur lors de la validation"
        }
      }));
    }
  };

  const handleEmailChange = (email: string, type: 'login' | 'register') => {
    if (type === 'login') {
      setLoginData(prev => ({ ...prev, email }));
    } else {
      setRegisterData(prev => ({ ...prev, email }));
    }

    // Debounce la validation
    const timer = setTimeout(() => {
      validateEmail(email, type);
    }, 500);

    return () => clearTimeout(timer);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/login/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      if (response.ok) {
        // Envoyer le code via notre nouvelle API
        try {
          await clientEmailService.sendVerificationCode(
            loginData.email,
            'login'
          );

          setVerificationStep({ type: 'login', email: loginData.email });
          console.log('Code de connexion envoyé avec succès');
        } catch (emailError) {
          console.error('Erreur envoi email:', emailError);
          alert('Erreur lors de l\'envoi de l\'email. Veuillez réessayer.');
        }
      } else {
        const error = await response.json();
        console.error('Erreur connexion:', error);
        alert(error.error || 'Email ou mot de passe incorrect');
      }
    } catch (error) {
      console.error('Erreur connexion:', error);
      alert('Erreur lors de la connexion');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Étape 1: Demande d'inscription
      const response = await fetch('/api/register/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      });

      if (response.ok) {
        // Étape 2: Envoyer le code via notre nouvelle API
        try {
          await clientEmailService.sendVerificationCode(
            registerData.email,
            'registration',
            registerData.username
          );

          setVerificationStep({ type: 'register', email: registerData.email });
          console.log('Code envoyé avec succès');
        } catch (emailError) {
          console.error('Erreur envoi email:', emailError);
          alert('Erreur lors de l\'envoi de l\'email. Veuillez réessayer.');
        }
      } else {
        const error = await response.json();
        console.error('Erreur inscription:', error);
        alert(error.error || 'Erreur lors de l\'inscription');
      }
    } catch (error) {
      console.error('Erreur inscription:', error);
      alert('Erreur lors de l\'inscription');
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = verificationStep.type === 'login' ? '/api/login/verify' : '/api/register/verify';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: verificationStep.email,
          code: verificationCode
        })
      });

      if (response.ok) {
        const userData = await response.json();
        
        // Afficher immédiatement l'écran de chargement
        setShowLoadingPage(true);
        
        // Marquer dans le localStorage que l'utilisateur vient de se connecter
        localStorage.setItem('user_session_started', 'false');
        
        // Attendre 3 secondes puis recharger pour finaliser l'authentification
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        const error = await response.json();
        console.error('Erreur vérification:', error);
        alert('Code de vérification incorrect');
      }
    } catch (error) {
      console.error('Erreur vérification:', error);
      alert('Erreur lors de la vérification');
    }
  };

  useEffect(() => {
    // Initialiser EmailJS
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    script.onload = () => {
      if (window.emailjs) {
        window.emailjs.init("80uppJ5N5LVthj_SB");
        console.log('EmailJS initialisé');
      }
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Afficher l'écran de chargement si demandé
  if (showLoadingPage) {
    return <LoadingPage />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Formulaire de connexion/inscription */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 mr-3">
                <img 
                  src="/logo.png" 
                  alt="Logo Gbairai" 
                  className="w-full h-full object-contain"
                />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Gbairai</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {verificationStep.type ? (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">
                    Vérification par email
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Un code de vérification a été envoyé à<br />
                    <strong>{verificationStep.email}</strong>
                  </p>
                </div>

                <form onSubmit={handleVerification} className="space-y-4">
                  <div>
                    <Label htmlFor="verification-code">Code de vérification</Label>
                    <Input
                      id="verification-code"
                      type="text"
                      placeholder="123456"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      maxLength={6}
                      className="text-center text-lg font-mono"
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-ivorian-orange hover:bg-orange-600"
                  >
                    Vérifier le code
                  </Button>

                  <Button 
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setVerificationStep({ type: null, email: "" });
                      setVerificationCode("");
                    }}
                  >
                    Retour
                  </Button>
                </form>
              </div>
            ) : (
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Connexion</TabsTrigger>
                  <TabsTrigger value="register">Inscription</TabsTrigger>
                </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={loginData.email}
                        onChange={(e) => handleEmailChange(e.target.value, 'login')}
                        className={`pr-10 ${
                          loginData.email && !emailValidation.login.isValidating
                            ? emailValidation.login.isValid
                              ? 'border-green-500'
                              : 'border-red-500'
                            : ''
                        }`}
                        required
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {emailValidation.login.isValidating ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        ) : loginData.email && emailValidation.login.message ? (
                          emailValidation.login.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )
                        ) : null}
                      </div>
                    </div>
                    {loginData.email && emailValidation.login.message && (
                      <p className={`text-sm mt-1 ${
                        emailValidation.login.isValid ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {emailValidation.login.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="login-password">Mot de passe</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({...prev, password: e.target.value}))}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-ivorian-orange hover:bg-orange-600"
                    disabled={loginMutation.isPending || !emailValidation.login.isValid}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connexion...
                      </>
                    ) : (
                      "Se connecter"
                    )}
                  </Button>
                  
                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={() => setLocation("/reset-password")}
                      className="text-red-600 hover:text-red-800 text-sm underline"
                    >
                      Mot de passe oublié?
                    </button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label htmlFor="register-username">Nom d'utilisateur</Label>
                    <Input
                      id="register-username"
                      type="text"
                      placeholder="votre_nom_utilisateur"
                      value={registerData.username}
                      onChange={(e) => setRegisterData(prev => ({...prev, username: e.target.value}))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="register-email">Email</Label>
                    <div className="relative">
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={registerData.email}
                        onChange={(e) => handleEmailChange(e.target.value, 'register')}
                        className={`pr-10 ${
                          registerData.email && !emailValidation.register.isValidating
                            ? emailValidation.register.isValid
                              ? 'border-green-500'
                              : 'border-red-500'
                            : ''
                        }`}
                        required
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {emailValidation.register.isValidating ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        ) : registerData.email && emailValidation.register.message ? (
                          emailValidation.register.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )
                        ) : null}
                      </div>
                    </div>
                    {registerData.email && emailValidation.register.message && (
                      <p className={`text-sm mt-1 ${
                        emailValidation.register.isValid ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {emailValidation.register.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="register-password">Mot de passe</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      value={registerData.password}
                      onChange={(e) => setRegisterData(prev => ({...prev, password: e.target.value}))}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-ivorian-orange hover:bg-orange-600"
                    disabled={registerMutation.isPending || !emailValidation.register.isValid}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Inscription...
                      </>
                    ) : (
                      "S'inscrire"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Section héro */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-ivorian-orange to-ivorian-green items-center justify-center p-8">
        <div className="text-center text-[#000000]">
          <h1 className="text-4xl font-bold mb-6">
            Bienvenue sur Gbairai
          </h1>
          <p className="text-xl mb-8">
            Le réseau social qui connecte les Ivoiriens à travers leurs émotions
          </p>
          <div className="grid grid-cols-2 gap-6 max-w-md">
            <div className="text-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">😊</span>
              </div>
              <p className="text-sm">Partagez vos joies</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">🗺️</span>
              </div>
              <p className="text-sm">Découvrez votre région</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">🤝</span>
              </div>
              <p className="text-sm">Connectez-vous</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">🧠</span>
              </div>
              <p className="text-sm">IA contextuelle</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}