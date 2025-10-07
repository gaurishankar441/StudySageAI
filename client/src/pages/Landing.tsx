import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { GraduationCap, Globe } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import logoPath from "@assets/Vakta AI.122_1759509648531.png";

// Login schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

// Signup schema
const signupSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

export default function Landing() {
  const [currentLang, setCurrentLang] = useState("English");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const toggleLanguage = () => {
    setCurrentLang(currentLang === "English" ? "हिन्दी" : "English");
  };

  // Login form
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Signup form
  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: async (data: SignupForm) => {
      const response = await apiRequest("POST", "/api/auth/signup", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Account created!",
        description: "Welcome to VaktaAI. Let's get started!",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Signup failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    },
  });

  const onLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onSignup = (data: SignupForm) => {
    signupMutation.mutate(data);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-radial p-4 overflow-hidden">
      {/* Vibrant background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
      
      {/* Language Toggle - Top Right */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={toggleLanguage}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm text-foreground hover:bg-white/10 transition-smooth shadow-lg"
          data-testid="button-language-toggle"
        >
          <Globe className="w-4 h-4" />
          <span className="font-medium">{currentLang}</span>
        </button>
      </div>

      <div className="w-full max-w-md relative z-0">
        {/* Logo & Branding */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center mb-6">
            <img 
              src={logoPath} 
              alt="Vakta AI" 
              className="w-36 h-36 object-contain drop-shadow-2xl"
            />
          </div>
          <h1 className="text-5xl font-bold gradient-text mb-3">VaktaAI</h1>
          <p className="text-lg text-muted-foreground">Your AI-powered study companion</p>
        </div>
        
        {/* Auth Card with Glassmorphism */}
        <div className="glass-card rounded-2xl p-8 animate-slide-in" style={{ boxShadow: 'var(--shadow-xl)' }}>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1 rounded-xl">
              <TabsTrigger 
                value="login" 
                data-testid="tab-login"
                className="rounded-lg transition-smooth data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-md"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                data-testid="tab-signup"
                className="rounded-lg transition-smooth data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-md"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>
            
            {/* Login Tab */}
            <TabsContent value="login">
              <h2 className="text-2xl font-bold mb-8 text-center">Welcome back</h2>
              
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Email address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="you@example.com"
                            data-testid="input-email-login"
                            className="h-12 px-4 bg-background/50 border-border/50 focus:border-primary focus:bg-background transition-smooth"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="••••••••"
                            data-testid="input-password-login"
                            className="h-12 px-4 bg-background/50 border-border/50 focus:border-primary focus:bg-background transition-smooth"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button
                    type="submit"
                    className="w-full h-12 btn-gradient text-base font-semibold mt-6"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            {/* Signup Tab */}
            <TabsContent value="signup">
              <h2 className="text-2xl font-bold mb-8 text-center">Create account</h2>
              
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={signupForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">First name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="John"
                              data-testid="input-firstname"
                              className="h-12 px-4 bg-background/50 border-border/50 focus:border-primary focus:bg-background transition-smooth"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signupForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">Last name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Doe"
                              data-testid="input-lastname"
                              className="h-12 px-4 bg-background/50 border-border/50 focus:border-primary focus:bg-background transition-smooth"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Email address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="you@example.com"
                            data-testid="input-email-signup"
                            className="h-12 px-4 bg-background/50 border-border/50 focus:border-primary focus:bg-background transition-smooth"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="••••••••"
                            data-testid="input-password-signup"
                            className="h-12 px-4 bg-background/50 border-border/50 focus:border-primary focus:bg-background transition-smooth"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button
                    type="submit"
                    className="w-full h-12 btn-gradient text-base font-semibold mt-6"
                    disabled={signupMutation.isPending}
                    data-testid="button-signup"
                  >
                    {signupMutation.isPending ? "Creating account..." : "Create account"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
