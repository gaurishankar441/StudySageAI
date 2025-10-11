import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Mic, Volume2, Settings2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export default function AdminVoiceSettings() {
  const { toast } = useToast();

  // TTS Provider Settings State
  const [ttsConfig, setTtsConfig] = useState({
    primaryProvider: 'sarvam',
    fallbackProvider: 'polly',
    enableFallback: true,
    sarvam: {
      enabled: true,
      speakers: {
        hindi: 'anushka',
        english: 'meera'
      },
      pitch: 1.0,
      pace: 1.0,
      loudness: 1.0
    },
    polly: {
      enabled: true,
      voices: {
        hindi: 'Aditi',
        english: 'Kajal'
      },
      engine: 'neural' as 'neural' | 'standard',
      speakingRate: 1.0,
      pitch: '+0%'
    },
    caching: {
      enabled: true,
      ttlSeconds: 3600,
      maxSize: 100
    }
  });

  // STT Provider Settings State
  const [sttConfig, setSttConfig] = useState({
    primaryProvider: 'sarvam',
    fallbackProvider: 'assemblyai',
    enableFallback: true,
    sarvam: {
      enabled: true,
      model: 'saarika:v2',
      language: 'hi-IN'
    },
    assemblyai: {
      enabled: true,
      language: 'hi'
    }
  });

  // Fetch TTS config
  const { data: ttsData } = useQuery({
    queryKey: ['/api/admin/configs/voice/tts'],
  });

  // Fetch STT config
  const { data: sttData } = useQuery({
    queryKey: ['/api/admin/configs/voice/stt'],
  });

  // Load TTS config when fetched
  useEffect(() => {
    if (ttsData && ttsData.value) {
      setTtsConfig(ttsData.value);
    }
  }, [ttsData]);

  // Load STT config when fetched
  useEffect(() => {
    if (sttData && sttData.value) {
      setSttConfig(sttData.value);
    }
  }, [sttData]);

  // Save TTS mutation
  const saveTtsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/admin/configs', {
        category: 'voice',
        key: 'tts',
        value: ttsConfig
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/configs/voice/tts'] });
      toast({
        title: "Success",
        description: "TTS settings saved successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save TTS settings",
        variant: "destructive"
      });
    }
  });

  // Save STT mutation
  const saveSttMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/admin/configs', {
        category: 'voice',
        key: 'stt',
        value: sttConfig
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/configs/voice/stt'] });
      toast({
        title: "Success",
        description: "STT settings saved successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save STT settings",
        variant: "destructive"
      });
    }
  });

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold gradient-text">Voice Services Configuration</h1>
        <p className="text-muted-foreground">Manage TTS and STT provider settings</p>
      </div>

      <Tabs defaultValue="tts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tts" data-testid="tab-tts">
            <Volume2 className="w-4 h-4 mr-2" />
            Text-to-Speech
          </TabsTrigger>
          <TabsTrigger value="stt" data-testid="tab-stt">
            <Mic className="w-4 h-4 mr-2" />
            Speech-to-Text
          </TabsTrigger>
        </TabsList>

        {/* TTS Configuration */}
        <TabsContent value="tts" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Provider Configuration</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Provider</Label>
                  <Select 
                    value={ttsConfig.primaryProvider} 
                    onValueChange={(val) => setTtsConfig({ ...ttsConfig, primaryProvider: val })}
                  >
                    <SelectTrigger data-testid="select-tts-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sarvam">Sarvam AI</SelectItem>
                      <SelectItem value="polly">AWS Polly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fallback Provider</Label>
                  <Select 
                    value={ttsConfig.fallbackProvider} 
                    onValueChange={(val) => setTtsConfig({ ...ttsConfig, fallbackProvider: val })}
                  >
                    <SelectTrigger data-testid="select-tts-fallback">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="polly">AWS Polly</SelectItem>
                      <SelectItem value="sarvam">Sarvam AI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Fallback</Label>
                  <p className="text-xs text-muted-foreground">Automatically switch to fallback on primary failure</p>
                </div>
                <Switch
                  checked={ttsConfig.enableFallback}
                  onCheckedChange={(checked) => setTtsConfig({ ...ttsConfig, enableFallback: checked })}
                  data-testid="switch-tts-fallback"
                />
              </div>
            </div>
          </Card>

          {/* Sarvam AI Settings */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Sarvam AI Settings</h3>
              <Switch
                checked={ttsConfig.sarvam.enabled}
                onCheckedChange={(checked) => setTtsConfig({
                  ...ttsConfig,
                  sarvam: { ...ttsConfig.sarvam, enabled: checked }
                })}
                data-testid="switch-sarvam-enabled"
              />
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hindi Speaker</Label>
                  <Select 
                    value={ttsConfig.sarvam.speakers.hindi}
                    onValueChange={(val) => setTtsConfig({
                      ...ttsConfig,
                      sarvam: { ...ttsConfig.sarvam, speakers: { ...ttsConfig.sarvam.speakers, hindi: val }}
                    })}
                  >
                    <SelectTrigger data-testid="select-sarvam-hindi-speaker">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anushka">Anushka</SelectItem>
                      <SelectItem value="arvind">Arvind</SelectItem>
                      <SelectItem value="meera">Meera</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>English Speaker</Label>
                  <Select 
                    value={ttsConfig.sarvam.speakers.english}
                    onValueChange={(val) => setTtsConfig({
                      ...ttsConfig,
                      sarvam: { ...ttsConfig.sarvam, speakers: { ...ttsConfig.sarvam.speakers, english: val }}
                    })}
                  >
                    <SelectTrigger data-testid="select-sarvam-english-speaker">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meera">Meera</SelectItem>
                      <SelectItem value="anushka">Anushka</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Pitch</Label>
                    <span className="text-sm text-muted-foreground">{ttsConfig.sarvam.pitch.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[ttsConfig.sarvam.pitch]}
                    onValueChange={([val]) => setTtsConfig({
                      ...ttsConfig,
                      sarvam: { ...ttsConfig.sarvam, pitch: val }
                    })}
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    data-testid="slider-sarvam-pitch"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Pace</Label>
                    <span className="text-sm text-muted-foreground">{ttsConfig.sarvam.pace.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[ttsConfig.sarvam.pace]}
                    onValueChange={([val]) => setTtsConfig({
                      ...ttsConfig,
                      sarvam: { ...ttsConfig.sarvam, pace: val }
                    })}
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    data-testid="slider-sarvam-pace"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Loudness</Label>
                    <span className="text-sm text-muted-foreground">{ttsConfig.sarvam.loudness.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[ttsConfig.sarvam.loudness]}
                    onValueChange={([val]) => setTtsConfig({
                      ...ttsConfig,
                      sarvam: { ...ttsConfig.sarvam, loudness: val }
                    })}
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    data-testid="slider-sarvam-loudness"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* AWS Polly Settings */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">AWS Polly Settings</h3>
              <Switch
                checked={ttsConfig.polly.enabled}
                onCheckedChange={(checked) => setTtsConfig({
                  ...ttsConfig,
                  polly: { ...ttsConfig.polly, enabled: checked }
                })}
                data-testid="switch-polly-enabled"
              />
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hindi Voice</Label>
                  <Select 
                    value={ttsConfig.polly.voices.hindi}
                    onValueChange={(val) => setTtsConfig({
                      ...ttsConfig,
                      polly: { ...ttsConfig.polly, voices: { ...ttsConfig.polly.voices, hindi: val }}
                    })}
                  >
                    <SelectTrigger data-testid="select-polly-hindi-voice">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aditi">Aditi (Hindi)</SelectItem>
                      <SelectItem value="Raveena">Raveena (Indian English)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>English Voice</Label>
                  <Select 
                    value={ttsConfig.polly.voices.english}
                    onValueChange={(val) => setTtsConfig({
                      ...ttsConfig,
                      polly: { ...ttsConfig.polly, voices: { ...ttsConfig.polly.voices, english: val }}
                    })}
                  >
                    <SelectTrigger data-testid="select-polly-english-voice">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kajal">Kajal (Indian English)</SelectItem>
                      <SelectItem value="Raveena">Raveena (Indian English)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Engine</Label>
                  <Select 
                    value={ttsConfig.polly.engine}
                    onValueChange={(val: 'neural' | 'standard') => setTtsConfig({
                      ...ttsConfig,
                      polly: { ...ttsConfig.polly, engine: val }
                    })}
                  >
                    <SelectTrigger data-testid="select-polly-engine">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neural">Neural (High Quality)</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Speaking Rate</Label>
                  <Input
                    type="number"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={ttsConfig.polly.speakingRate}
                    onChange={(e) => setTtsConfig({
                      ...ttsConfig,
                      polly: { ...ttsConfig.polly, speakingRate: parseFloat(e.target.value) }
                    })}
                    data-testid="input-polly-speaking-rate"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Caching Settings */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">TTS Caching</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Phrase-Level Caching</Label>
                  <p className="text-xs text-muted-foreground">Cache generated TTS audio in Redis for faster responses</p>
                </div>
                <Switch
                  checked={ttsConfig.caching.enabled}
                  onCheckedChange={(checked) => setTtsConfig({
                    ...ttsConfig,
                    caching: { ...ttsConfig.caching, enabled: checked }
                  })}
                  data-testid="switch-tts-caching"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>TTL (seconds)</Label>
                  <Input
                    type="number"
                    value={ttsConfig.caching.ttlSeconds}
                    onChange={(e) => setTtsConfig({
                      ...ttsConfig,
                      caching: { ...ttsConfig.caching, ttlSeconds: parseInt(e.target.value) }
                    })}
                    data-testid="input-cache-ttl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Cache Size (MB)</Label>
                  <Input
                    type="number"
                    value={ttsConfig.caching.maxSize}
                    onChange={(e) => setTtsConfig({
                      ...ttsConfig,
                      caching: { ...ttsConfig.caching, maxSize: parseInt(e.target.value) }
                    })}
                    data-testid="input-cache-max-size"
                  />
                </div>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button 
              onClick={() => saveTtsMutation.mutate()}
              disabled={saveTtsMutation.isPending}
              data-testid="button-save-tts"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveTtsMutation.isPending ? 'Saving...' : 'Save TTS Settings'}
            </Button>
          </div>
        </TabsContent>

        {/* STT Configuration */}
        <TabsContent value="stt" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Provider Configuration</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Provider</Label>
                  <Select 
                    value={sttConfig.primaryProvider} 
                    onValueChange={(val) => setSttConfig({ ...sttConfig, primaryProvider: val })}
                  >
                    <SelectTrigger data-testid="select-stt-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sarvam">Sarvam AI</SelectItem>
                      <SelectItem value="assemblyai">AssemblyAI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fallback Provider</Label>
                  <Select 
                    value={sttConfig.fallbackProvider} 
                    onValueChange={(val) => setSttConfig({ ...sttConfig, fallbackProvider: val })}
                  >
                    <SelectTrigger data-testid="select-stt-fallback">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assemblyai">AssemblyAI</SelectItem>
                      <SelectItem value="sarvam">Sarvam AI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Fallback</Label>
                  <p className="text-xs text-muted-foreground">Automatically switch to fallback on primary failure</p>
                </div>
                <Switch
                  checked={sttConfig.enableFallback}
                  onCheckedChange={(checked) => setSttConfig({ ...sttConfig, enableFallback: checked })}
                  data-testid="switch-stt-fallback"
                />
              </div>
            </div>
          </Card>

          {/* Sarvam STT Settings */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Sarvam AI STT</h3>
              <Switch
                checked={sttConfig.sarvam.enabled}
                onCheckedChange={(checked) => setSttConfig({
                  ...sttConfig,
                  sarvam: { ...sttConfig.sarvam, enabled: checked }
                })}
                data-testid="switch-sarvam-stt-enabled"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Model</Label>
                <Select 
                  value={sttConfig.sarvam.model}
                  onValueChange={(val) => setSttConfig({
                    ...sttConfig,
                    sarvam: { ...sttConfig.sarvam, model: val }
                  })}
                >
                  <SelectTrigger data-testid="select-sarvam-stt-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saarika:v1">Saarika v1</SelectItem>
                    <SelectItem value="saarika:v2">Saarika v2 (Latest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select 
                  value={sttConfig.sarvam.language}
                  onValueChange={(val) => setSttConfig({
                    ...sttConfig,
                    sarvam: { ...sttConfig.sarvam, language: val }
                  })}
                >
                  <SelectTrigger data-testid="select-sarvam-stt-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hi-IN">Hindi (India)</SelectItem>
                    <SelectItem value="en-IN">English (India)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* AssemblyAI Settings */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">AssemblyAI STT</h3>
              <Switch
                checked={sttConfig.assemblyai.enabled}
                onCheckedChange={(checked) => setSttConfig({
                  ...sttConfig,
                  assemblyai: { ...sttConfig.assemblyai, enabled: checked }
                })}
                data-testid="switch-assemblyai-enabled"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Language</Label>
              <Select 
                value={sttConfig.assemblyai.language}
                onValueChange={(val) => setSttConfig({
                  ...sttConfig,
                  assemblyai: { ...sttConfig.assemblyai, language: val }
                })}
              >
                <SelectTrigger data-testid="select-assemblyai-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button 
              onClick={() => saveSttMutation.mutate()}
              disabled={saveSttMutation.isPending}
              data-testid="button-save-stt"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveSttMutation.isPending ? 'Saving...' : 'Save STT Settings'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
