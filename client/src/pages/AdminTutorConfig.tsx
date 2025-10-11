import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Save, Trash2, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PersonaConfig {
  id: string;
  name: string;
  gender: 'male' | 'female';
  subjects: string[];
  personality: {
    traits: string[];
    toneOfVoice: string;
    catchphrases: string[];
    errorHandling: string;
    celebrationStyle: string;
  };
  voiceSettings: {
    sarvam?: {
      speaker: string;
      pitch: string;
      pace: string;
      loudness: string;
    };
    polly?: {
      voiceId: string;
      engine: 'neural' | 'standard';
      speakingRate: string;
      pitch: string;
    };
  };
  languageStyle: {
    hindiPercentage: number;
    englishPercentage: number;
    codeSwitch: string;
    technicalTerms: string;
  };
}

export default function AdminTutorConfig() {
  const { toast } = useToast();
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [editedPersona, setEditedPersona] = useState<PersonaConfig | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [newPersona, setNewPersona] = useState<Partial<PersonaConfig>>({
    name: '',
    gender: 'female',
    subjects: [],
    personality: {
      traits: [],
      toneOfVoice: '',
      catchphrases: [],
      errorHandling: '',
      celebrationStyle: ''
    },
    voiceSettings: {},
    languageStyle: {
      hindiPercentage: 50,
      englishPercentage: 50,
      codeSwitch: 'Natural mixing based on topic complexity',
      technicalTerms: 'English'
    }
  });

  // Fetch personas config
  const { data: personas, isLoading } = useQuery<PersonaConfig[]>({
    queryKey: ['/api/admin/configs/tutor/personas'],
  });

  // Update edited persona when selection changes
  useEffect(() => {
    if (selectedPersona && personas) {
      const persona = personas.find(p => p.id === selectedPersona);
      setEditedPersona(persona ? { ...persona } : null);
    }
  }, [selectedPersona, personas]);

  // Update config mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { category: string; key: string; value: any }) => {
      return apiRequest('POST', '/api/admin/configs', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/configs/tutor/personas'] });
      toast({
        title: "Success",
        description: "Persona updated successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update persona",
        variant: "destructive"
      });
    }
  });

  const handleSave = async () => {
    if (!editedPersona || !personas) return;

    const updatedPersonas = personas.map(p => 
      p.id === editedPersona.id ? editedPersona : p
    );

    await updateMutation.mutateAsync({
      category: 'tutor',
      key: 'personas',
      value: updatedPersonas
    });
  };

  const handleAddPersona = async () => {
    if (!newPersona.name || !personas) return;

    const personaToAdd: PersonaConfig = {
      id: newPersona.name.toLowerCase().replace(/\s+/g, '-'),
      name: newPersona.name,
      gender: newPersona.gender || 'female',
      subjects: newPersona.subjects || [],
      personality: newPersona.personality || {
        traits: [],
        toneOfVoice: '',
        catchphrases: [],
        errorHandling: '',
        celebrationStyle: ''
      },
      voiceSettings: newPersona.voiceSettings || {},
      languageStyle: newPersona.languageStyle || {
        hindiPercentage: 50,
        englishPercentage: 50,
        codeSwitch: 'Natural mixing based on topic complexity',
        technicalTerms: 'English'
      }
    };

    const updatedPersonas = [...personas, personaToAdd];

    await updateMutation.mutateAsync({
      category: 'tutor',
      key: 'personas',
      value: updatedPersonas
    });

    setIsAddDialogOpen(false);
    setNewPersona({
      name: '',
      gender: 'female',
      subjects: [],
      personality: {
        traits: [],
        toneOfVoice: '',
        catchphrases: [],
        errorHandling: '',
        celebrationStyle: ''
      },
      voiceSettings: {},
      languageStyle: {
        hindiPercentage: 50,
        englishPercentage: 50,
        codeSwitch: 'Natural mixing based on topic complexity',
        technicalTerms: 'English'
      }
    });
    setSelectedPersona(personaToAdd.id);
  };

  const handleDeletePersona = async () => {
    if (!selectedPersona || !personas) return;

    const updatedPersonas = personas.filter(p => p.id !== selectedPersona);

    await updateMutation.mutateAsync({
      category: 'tutor',
      key: 'personas',
      value: updatedPersonas
    });

    setIsDeleteAlertOpen(false);
    setSelectedPersona(null);
    setEditedPersona(null);
  };

  const updateField = (field: string, value: any) => {
    if (!editedPersona) return;
    setEditedPersona({ ...editedPersona, [field]: value });
  };

  const updateNestedField = (parent: string, field: string, value: any) => {
    if (!editedPersona) return;
    setEditedPersona({
      ...editedPersona,
      [parent]: { ...(editedPersona as any)[parent], [field]: value }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentPersonas = personas || [
    {
      id: 'priya',
      name: 'Priya',
      gender: 'female' as const,
      subjects: ['Physics', 'Mathematics'],
      personality: {
        traits: ['energetic', 'encouraging'],
        toneOfVoice: 'warm and enthusiastic',
        catchphrases: ['Waah! Bilkul sahi!'],
        errorHandling: 'gentle and supportive',
        celebrationStyle: 'enthusiastic'
      },
      voiceSettings: {
        sarvam: { speaker: 'anushka', pitch: '1.05', pace: '1.05', loudness: '1.0' },
        polly: { voiceId: 'Kajal', engine: 'neural' as const, speakingRate: '1.05', pitch: '+5%' }
      },
      languageStyle: {
        hindiPercentage: 60,
        englishPercentage: 40,
        codeSwitch: 'natural and frequent',
        technicalTerms: 'English with Hindi explanation'
      }
    }
  ];

  const selectedPersonaData = editedPersona;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold gradient-text">AI Tutor Configuration</h1>
          <p className="text-muted-foreground">Manage personas, prompts, and response settings</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-persona">
              <Plus className="w-4 h-4 mr-2" />
              Add Persona
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Persona</DialogTitle>
              <DialogDescription>
                Create a new AI tutor persona with custom settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newPersona.name || ''}
                  onChange={(e) => setNewPersona({ ...newPersona, name: e.target.value })}
                  placeholder="e.g., Rajesh"
                  data-testid="input-new-persona-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={newPersona.gender}
                  onValueChange={(value: 'male' | 'female') => setNewPersona({ ...newPersona, gender: value })}
                >
                  <SelectTrigger data-testid="select-new-persona-gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subjects (comma-separated)</Label>
                <Input
                  value={newPersona.subjects?.join(', ') || ''}
                  onChange={(e) => setNewPersona({ ...newPersona, subjects: e.target.value.split(',').map(s => s.trim()) })}
                  placeholder="Physics, Chemistry, Mathematics"
                  data-testid="input-new-persona-subjects"
                />
              </div>
              <div className="space-y-2">
                <Label>Tone of Voice</Label>
                <Input
                  value={newPersona.personality?.toneOfVoice || ''}
                  onChange={(e) => setNewPersona({
                    ...newPersona,
                    personality: { ...newPersona.personality!, toneOfVoice: e.target.value }
                  })}
                  placeholder="e.g., Friendly and supportive"
                  data-testid="input-new-persona-tone"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  data-testid="button-cancel-add-persona"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddPersona}
                  disabled={!newPersona.name || updateMutation.isPending}
                  data-testid="button-confirm-add-persona"
                >
                  {updateMutation.isPending ? 'Adding...' : 'Add Persona'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="personas" className="space-y-6">
        <TabsList>
          <TabsTrigger value="personas" data-testid="tab-personas">Personas</TabsTrigger>
          <TabsTrigger value="prompts" data-testid="tab-prompts">System Prompts</TabsTrigger>
          <TabsTrigger value="first-messages" data-testid="tab-first-messages">First Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="personas" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Persona List */}
            <Card className="p-4 lg:col-span-1">
              <h3 className="font-semibold mb-4">Personas</h3>
              <div className="space-y-2">
                {currentPersonas.map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() => setSelectedPersona(persona.id)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedPersona === persona.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                    data-testid={`button-persona-${persona.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5" />
                      <div className="flex-1">
                        <p className="font-medium">{persona.name}</p>
                        <p className="text-xs opacity-80">{persona.subjects.join(', ')}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Persona Editor */}
            <Card className="p-6 lg:col-span-2">
              {selectedPersonaData ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">{selectedPersonaData.name}</h3>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        data-testid="button-save-persona"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateMutation.isPending ? 'Saving...' : 'Save'}
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => setIsDeleteAlertOpen(true)}
                        data-testid="button-delete-persona"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input 
                        value={selectedPersonaData.name} 
                        onChange={(e) => updateField('name', e.target.value)}
                        data-testid="input-persona-name" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select 
                        value={selectedPersonaData.gender}
                        onValueChange={(value) => updateField('gender', value)}
                      >
                        <SelectTrigger data-testid="select-persona-gender">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Subjects</Label>
                    <Input 
                      value={selectedPersonaData.subjects.join(', ')} 
                      onChange={(e) => updateField('subjects', e.target.value.split(',').map(s => s.trim()))}
                      placeholder="Physics, Mathematics"
                      data-testid="input-persona-subjects"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tone of Voice</Label>
                    <Input 
                      value={selectedPersonaData.personality.toneOfVoice}
                      onChange={(e) => updateNestedField('personality', 'toneOfVoice', e.target.value)}
                      data-testid="input-persona-tone"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Catchphrases (one per line)</Label>
                    <Textarea 
                      value={selectedPersonaData.personality.catchphrases.join('\n')}
                      onChange={(e) => updateNestedField('personality', 'catchphrases', e.target.value.split('\n'))}
                      rows={5}
                      data-testid="textarea-persona-catchphrases"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Hindi %</Label>
                      <Input 
                        type="number" 
                        value={selectedPersonaData.languageStyle.hindiPercentage}
                        onChange={(e) => updateNestedField('languageStyle', 'hindiPercentage', parseInt(e.target.value))}
                        data-testid="input-persona-hindi-percent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>English %</Label>
                      <Input 
                        type="number" 
                        value={selectedPersonaData.languageStyle.englishPercentage}
                        onChange={(e) => updateNestedField('languageStyle', 'englishPercentage', parseInt(e.target.value))}
                        data-testid="input-persona-english-percent"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  Select a persona to edit
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="prompts">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">System Prompts</h3>
            <p className="text-muted-foreground">Configure AI tutor system prompts and instructions</p>
            {/* TODO: Prompt editor */}
          </Card>
        </TabsContent>

        <TabsContent value="first-messages">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">First Messages</h3>
            <p className="text-muted-foreground">Configure tutor greeting messages by language</p>
            {/* TODO: First message editor */}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Persona?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {editedPersona?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePersona}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {updateMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
