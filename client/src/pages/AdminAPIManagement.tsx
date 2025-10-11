import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Eye, EyeOff, Key, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export default function AdminAPIManagement() {
  const { toast } = useToast();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // API Keys State
  const [apiKeys, setApiKeys] = useState({
    openai: {
      enabled: true,
      apiKey: '',
      organization: '',
      models: {
        chat: 'gpt-4o-mini',
        embedding: 'text-embedding-3-small'
      }
    },
    gemini: {
      enabled: true,
      apiKey: '',
      models: {
        chat: 'gemini-1.5-flash',
        embedding: 'text-embedding-004'
      }
    },
    anthropic: {
      enabled: true,
      apiKey: '',
      models: {
        chat: 'claude-3-haiku-20240307'
      }
    },
    sarvam: {
      enabled: true,
      apiKey: '',
      services: {
        tts: true,
        stt: true
      }
    },
    assemblyai: {
      enabled: true,
      apiKey: ''
    },
    aws: {
      enabled: true,
      accessKeyId: '',
      secretAccessKey: '',
      region: 'ap-south-1',
      services: {
        s3: true,
        polly: true
      }
    }
  });

  // Fetch API keys config
  const { data: apiKeysData } = useQuery({
    queryKey: ['/api/admin/configs/api/keys'],
  });

  // Load API keys when fetched
  useEffect(() => {
    if (apiKeysData && apiKeysData.value) {
      setApiKeys(apiKeysData.value);
    }
  }, [apiKeysData]);

  // Save API keys mutation
  const saveApiKeysMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/admin/configs', {
        category: 'api',
        key: 'keys',
        value: apiKeys
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/configs/api/keys'] });
      toast({
        title: "Success",
        description: "API keys saved successfully (encrypted)"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save API keys",
        variant: "destructive"
      });
    }
  });

  const toggleKeyVisibility = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '****';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold gradient-text">API Management</h1>
          <p className="text-muted-foreground">Manage API keys and service providers (encrypted storage)</p>
        </div>
        <Button 
          onClick={() => saveApiKeysMutation.mutate()}
          disabled={saveApiKeysMutation.isPending}
          data-testid="button-save-api-keys"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveApiKeysMutation.isPending ? 'Saving...' : 'Save All Keys'}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* OpenAI */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold">OpenAI</h3>
              <Badge variant={apiKeys.openai.enabled ? "default" : "secondary"}>
                {apiKeys.openai.enabled ? 'Active' : 'Disabled'}
              </Badge>
            </div>
            <Switch
              checked={apiKeys.openai.enabled}
              onCheckedChange={(checked) => setApiKeys({
                ...apiKeys,
                openai: { ...apiKeys.openai, enabled: checked }
              })}
              data-testid="switch-openai-enabled"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input
                  type={showKeys['openai'] ? 'text' : 'password'}
                  value={apiKeys.openai.apiKey}
                  onChange={(e) => setApiKeys({
                    ...apiKeys,
                    openai: { ...apiKeys.openai, apiKey: e.target.value }
                  })}
                  placeholder="sk-..."
                  className="font-mono"
                  data-testid="input-openai-key"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleKeyVisibility('openai')}
                  data-testid="button-toggle-openai-key"
                >
                  {showKeys['openai'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Organization ID (Optional)</Label>
                <Input
                  value={apiKeys.openai.organization}
                  onChange={(e) => setApiKeys({
                    ...apiKeys,
                    openai: { ...apiKeys.openai, organization: e.target.value }
                  })}
                  placeholder="org-..."
                  data-testid="input-openai-org"
                />
              </div>
              <div className="space-y-2">
                <Label>Chat Model</Label>
                <Input
                  value={apiKeys.openai.models.chat}
                  onChange={(e) => setApiKeys({
                    ...apiKeys,
                    openai: { 
                      ...apiKeys.openai, 
                      models: { ...apiKeys.openai.models, chat: e.target.value }
                    }
                  })}
                  placeholder="gpt-4o-mini"
                  data-testid="input-openai-chat-model"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Google Gemini */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold">Google Gemini</h3>
              <Badge variant={apiKeys.gemini.enabled ? "default" : "secondary"}>
                {apiKeys.gemini.enabled ? 'Active' : 'Disabled'}
              </Badge>
            </div>
            <Switch
              checked={apiKeys.gemini.enabled}
              onCheckedChange={(checked) => setApiKeys({
                ...apiKeys,
                gemini: { ...apiKeys.gemini, enabled: checked }
              })}
              data-testid="switch-gemini-enabled"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input
                  type={showKeys['gemini'] ? 'text' : 'password'}
                  value={apiKeys.gemini.apiKey}
                  onChange={(e) => setApiKeys({
                    ...apiKeys,
                    gemini: { ...apiKeys.gemini, apiKey: e.target.value }
                  })}
                  placeholder="AIza..."
                  className="font-mono"
                  data-testid="input-gemini-key"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleKeyVisibility('gemini')}
                  data-testid="button-toggle-gemini-key"
                >
                  {showKeys['gemini'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Chat Model</Label>
              <Input
                value={apiKeys.gemini.models.chat}
                onChange={(e) => setApiKeys({
                  ...apiKeys,
                  gemini: { 
                    ...apiKeys.gemini, 
                    models: { ...apiKeys.gemini.models, chat: e.target.value }
                  }
                })}
                placeholder="gemini-1.5-flash"
                data-testid="input-gemini-chat-model"
              />
            </div>
          </div>
        </Card>

        {/* Anthropic */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold">Anthropic Claude</h3>
              <Badge variant={apiKeys.anthropic.enabled ? "default" : "secondary"}>
                {apiKeys.anthropic.enabled ? 'Active' : 'Disabled'}
              </Badge>
            </div>
            <Switch
              checked={apiKeys.anthropic.enabled}
              onCheckedChange={(checked) => setApiKeys({
                ...apiKeys,
                anthropic: { ...apiKeys.anthropic, enabled: checked }
              })}
              data-testid="switch-anthropic-enabled"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input
                  type={showKeys['anthropic'] ? 'text' : 'password'}
                  value={apiKeys.anthropic.apiKey}
                  onChange={(e) => setApiKeys({
                    ...apiKeys,
                    anthropic: { ...apiKeys.anthropic, apiKey: e.target.value }
                  })}
                  placeholder="sk-ant-..."
                  className="font-mono"
                  data-testid="input-anthropic-key"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleKeyVisibility('anthropic')}
                  data-testid="button-toggle-anthropic-key"
                >
                  {showKeys['anthropic'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Chat Model</Label>
              <Input
                value={apiKeys.anthropic.models.chat}
                onChange={(e) => setApiKeys({
                  ...apiKeys,
                  anthropic: { 
                    ...apiKeys.anthropic, 
                    models: { ...apiKeys.anthropic.models, chat: e.target.value }
                  }
                })}
                placeholder="claude-3-haiku-20240307"
                data-testid="input-anthropic-chat-model"
              />
            </div>
          </div>
        </Card>

        {/* Sarvam AI */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold">Sarvam AI</h3>
              <Badge variant={apiKeys.sarvam.enabled ? "default" : "secondary"}>
                {apiKeys.sarvam.enabled ? 'Active' : 'Disabled'}
              </Badge>
            </div>
            <Switch
              checked={apiKeys.sarvam.enabled}
              onCheckedChange={(checked) => setApiKeys({
                ...apiKeys,
                sarvam: { ...apiKeys.sarvam, enabled: checked }
              })}
              data-testid="switch-sarvam-enabled"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input
                  type={showKeys['sarvam'] ? 'text' : 'password'}
                  value={apiKeys.sarvam.apiKey}
                  onChange={(e) => setApiKeys({
                    ...apiKeys,
                    sarvam: { ...apiKeys.sarvam, apiKey: e.target.value }
                  })}
                  placeholder="Enter Sarvam API key"
                  className="font-mono"
                  data-testid="input-sarvam-key"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleKeyVisibility('sarvam')}
                  data-testid="button-toggle-sarvam-key"
                >
                  {showKeys['sarvam'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={apiKeys.sarvam.services.tts}
                  onCheckedChange={(checked) => setApiKeys({
                    ...apiKeys,
                    sarvam: { 
                      ...apiKeys.sarvam, 
                      services: { ...apiKeys.sarvam.services, tts: checked }
                    }
                  })}
                  data-testid="switch-sarvam-tts"
                />
                <Label>TTS (Text-to-Speech)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={apiKeys.sarvam.services.stt}
                  onCheckedChange={(checked) => setApiKeys({
                    ...apiKeys,
                    sarvam: { 
                      ...apiKeys.sarvam, 
                      services: { ...apiKeys.sarvam.services, stt: checked }
                    }
                  })}
                  data-testid="switch-sarvam-stt"
                />
                <Label>STT (Speech-to-Text)</Label>
              </div>
            </div>
          </div>
        </Card>

        {/* AWS */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold">Amazon Web Services</h3>
              <Badge variant={apiKeys.aws.enabled ? "default" : "secondary"}>
                {apiKeys.aws.enabled ? 'Active' : 'Disabled'}
              </Badge>
            </div>
            <Switch
              checked={apiKeys.aws.enabled}
              onCheckedChange={(checked) => setApiKeys({
                ...apiKeys,
                aws: { ...apiKeys.aws, enabled: checked }
              })}
              data-testid="switch-aws-enabled"
            />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Access Key ID</Label>
                <div className="flex gap-2">
                  <Input
                    type={showKeys['aws_access'] ? 'text' : 'password'}
                    value={apiKeys.aws.accessKeyId}
                    onChange={(e) => setApiKeys({
                      ...apiKeys,
                      aws: { ...apiKeys.aws, accessKeyId: e.target.value }
                    })}
                    placeholder="AKIA..."
                    className="font-mono"
                    data-testid="input-aws-access-key"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleKeyVisibility('aws_access')}
                    data-testid="button-toggle-aws-access"
                  >
                    {showKeys['aws_access'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secret Access Key</Label>
                <div className="flex gap-2">
                  <Input
                    type={showKeys['aws_secret'] ? 'text' : 'password'}
                    value={apiKeys.aws.secretAccessKey}
                    onChange={(e) => setApiKeys({
                      ...apiKeys,
                      aws: { ...apiKeys.aws, secretAccessKey: e.target.value }
                    })}
                    placeholder="Enter secret key"
                    className="font-mono"
                    data-testid="input-aws-secret-key"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleKeyVisibility('aws_secret')}
                    data-testid="button-toggle-aws-secret"
                  >
                    {showKeys['aws_secret'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Region</Label>
              <Input
                value={apiKeys.aws.region}
                onChange={(e) => setApiKeys({
                  ...apiKeys,
                  aws: { ...apiKeys.aws, region: e.target.value }
                })}
                placeholder="ap-south-1"
                data-testid="input-aws-region"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={apiKeys.aws.services.s3}
                  onCheckedChange={(checked) => setApiKeys({
                    ...apiKeys,
                    aws: { 
                      ...apiKeys.aws, 
                      services: { ...apiKeys.aws.services, s3: checked }
                    }
                  })}
                  data-testid="switch-aws-s3"
                />
                <Label>S3 (Object Storage)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={apiKeys.aws.services.polly}
                  onCheckedChange={(checked) => setApiKeys({
                    ...apiKeys,
                    aws: { 
                      ...apiKeys.aws, 
                      services: { ...apiKeys.aws.services, polly: checked }
                    }
                  })}
                  data-testid="switch-aws-polly"
                />
                <Label>Polly (TTS)</Label>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
