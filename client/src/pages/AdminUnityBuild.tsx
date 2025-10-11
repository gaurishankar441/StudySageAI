import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle, XCircle, Clock, Play, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UnityBuild {
  id: string;
  version: string;
  fileName: string;
  fileSize: number;
  s3Keys: string[];
  status: 'active' | 'inactive' | 'uploading';
  uploadedAt: string;
}

export default function AdminUnityBuild() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch Unity builds
  const { data: builds, isLoading } = useQuery<UnityBuild[]>({
    queryKey: ['/api/admin/unity/builds'],
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('build', file);
      
      const response = await fetch('/api/admin/unity/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/unity/builds'] });
      setSelectedFile(null);
      toast({
        title: "Success",
        description: "Unity build uploaded successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload Unity build",
        variant: "destructive"
      });
    }
  });

  // Activate build mutation
  const activateMutation = useMutation({
    mutationFn: async (buildId: string) => {
      return apiRequest('POST', `/api/admin/unity/${buildId}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/unity/builds'] });
      toast({
        title: "Success",
        description: "Unity build activated successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to activate Unity build",
        variant: "destructive"
      });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.zip')) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid File",
          description: "Please select a ZIP file containing Unity WebGL build",
          variant: "destructive"
        });
      }
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentBuilds = builds || [];
  const activeBuild = currentBuilds.find(b => b.status === 'active');

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold gradient-text">Unity Build Management</h1>
        <p className="text-muted-foreground">Upload and manage Unity WebGL avatar builds</p>
      </div>

      {/* Upload Section */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Upload New Build</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              className="hidden"
              id="unity-build-upload"
              data-testid="input-unity-build-file"
            />
            <label htmlFor="unity-build-upload">
              <Button variant="outline" asChild data-testid="button-select-build">
                <span className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Select ZIP File
                </span>
              </Button>
            </label>
            {selectedFile && (
              <div className="flex-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({formatFileSize(selectedFile.size)})
                  </span>
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                  data-testid="button-upload-build"
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            ZIP file should contain Unity WebGL build files: Build.data.gz, Build.wasm.gz, Build.framework.js.gz
          </p>
        </div>
      </Card>

      {/* Active Build */}
      {activeBuild && (
        <Card className="p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h3 className="text-lg font-semibold">Currently Active Build</h3>
              </div>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Version:</span> {activeBuild.version}</p>
                <p><span className="font-medium">File:</span> {activeBuild.fileName}</p>
                <p><span className="font-medium">Size:</span> {formatFileSize(activeBuild.fileSize)}</p>
                <p><span className="font-medium">Activated:</span> {formatDate(activeBuild.uploadedAt)}</p>
              </div>
            </div>
            <Badge variant="default" className="bg-green-500">Active</Badge>
          </div>
        </Card>
      )}

      {/* Build History */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Build History</h3>
        <div className="space-y-3">
          {currentBuilds.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No builds uploaded yet
            </div>
          ) : (
            currentBuilds.map((build) => (
              <div
                key={build.id}
                className={`p-4 rounded-lg border transition-colors ${
                  build.status === 'active'
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-background hover:bg-accent'
                }`}
                data-testid={`build-item-${build.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium">{build.version}</p>
                      {build.status === 'active' && (
                        <Badge variant="default" className="bg-green-500">Active</Badge>
                      )}
                      {build.status === 'uploading' && (
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          Uploading
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{build.fileName}</span>
                      <span>{formatFileSize(build.fileSize)}</span>
                      <span>{formatDate(build.uploadedAt)}</span>
                    </div>
                  </div>
                  
                  {build.status !== 'active' && build.status !== 'uploading' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => activateMutation.mutate(build.id)}
                      disabled={activateMutation.isPending}
                      data-testid={`button-activate-${build.id}`}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Activate
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
