import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import NotesModal from "@/components/notes/NotesModal";
import {
  Plus,
  Search,
  Mic,
  GraduationCap,
  FileText,
  CheckSquare,
  List,
  Edit,
  NotebookPen,
  Video,
  Link,
  Layers,
  Download,
  MoreVertical,
} from "lucide-react";
import { Note } from "@shared/schema";

const templates = [
  {
    id: 'lecture',
    name: 'Record Lecture',
    icon: Mic,
    color: 'bg-blue-100 text-blue-600',
    description: 'Audio recording with live transcription',
  },
  {
    id: 'research',
    name: 'Research Paper',
    icon: GraduationCap,
    color: 'bg-purple-100 text-purple-600',
    description: 'Structured academic writing format',
  },
  {
    id: 'review',
    name: 'Review Essay',
    icon: CheckSquare,
    color: 'bg-green-100 text-green-600',
    description: 'Organized review and analysis',
  },
  {
    id: 'summary',
    name: 'Summarize Article',
    icon: List,
    color: 'bg-amber-100 text-amber-600',
    description: 'Extract key points from content',
  },
  {
    id: 'blank',
    name: 'Blank Note',
    icon: Edit,
    color: 'bg-gray-100 text-gray-600',
    description: 'Start from scratch',
  },
];

export default function NotesView() {
  const [, navigate] = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
  });

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTemplateColor = (template?: string) => {
    switch (template) {
      case 'cornell':
        return 'from-blue-400 to-cyan-300';
      case 'lecture':
        return 'from-purple-400 to-pink-300';
      case 'research':
        return 'from-green-400 to-emerald-300';
      case 'summary':
        return 'from-amber-400 to-yellow-300';
      case 'review':
        return 'from-red-400 to-pink-300';
      default:
        return 'from-gray-400 to-slate-300';
    }
  };

  const getTemplateIcon = (template?: string) => {
    switch (template) {
      case 'cornell':
        return NotebookPen;
      case 'lecture':
        return Mic;
      case 'research':
        return GraduationCap;
      case 'summary':
        return List;
      case 'review':
        return CheckSquare;
      default:
        return FileText;
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setShowCreateModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Notes</h1>
          <p className="text-muted-foreground">Create, organize and enhance your study notes</p>
        </div>
        <Button
          onClick={() => {
            setSelectedTemplate("");
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          New Note
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Templates</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template.id)}
                className="p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all duration-200 text-center group"
              >
                <div className={`w-10 h-10 rounded-lg ${template.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="font-medium text-sm mb-1">{template.name}</p>
                <p className="text-xs text-muted-foreground">{template.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Recent Notes</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="pl-10 w-80"
            />
          </div>
        </div>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note) => {
            const TemplateIcon = getTemplateIcon(note.template || undefined);
            const gradientClass = getTemplateColor(note.template || undefined);
            
            return (
              <Card 
                key={note.id} 
                className="overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer group"
                onClick={() => navigate(`/notes/${note.id}`)}
                data-testid={`card-note-${note.id}`}
              >
                <div className={`h-32 bg-gradient-to-br ${gradientClass} p-4 flex items-end relative`}>
                  <div className="absolute top-4 right-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white hover:bg-white/20"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <Badge className="bg-white/30 backdrop-blur-sm text-white text-xs mb-2">
                      {note.template === 'cornell' ? 'Cornell Style' :
                       note.template === 'lecture' ? 'Lecture Notes' :
                       note.template === 'research' ? 'Research' :
                       note.template === 'summary' ? 'Summary' :
                       note.template === 'review' ? 'Review' :
                       'Custom'}
                    </Badge>
                    <h4 className="font-semibold text-white text-lg leading-tight">
                      {note.title}
                    </h4>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {/* Extract first few lines from content if it's a JSON object */}
                    {typeof note.content === 'object' && note.content && 'summary' in (note.content as any)
                      ? (note.content as any).summary?.substring(0, 120) + '...'
                      : 'Study notes with key concepts and examples...'}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Updated {new Date(note.updatedAt!).toLocaleDateString()}</span>
                    <div className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      <span>12 cards</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <NotebookPen className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {searchQuery ? 'No notes found' : 'No notes yet'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery 
              ? `No notes match "${searchQuery}". Try a different search term.`
              : 'Create your first note using one of the templates above'
            }
          </p>
          {!searchQuery && (
            <Button
              onClick={() => {
                setSelectedTemplate("");
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Your First Note
            </Button>
          )}
        </Card>
      )}

      {/* Recent Activity */}
      {notes.length > 0 && (
        <Card className="mt-6">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Recent Activity</h3>
          </div>
          <div className="divide-y divide-border">
            <div className="p-4 flex items-center gap-4 hover:bg-accent transition-colors duration-200">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Plus className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Created note from YouTube video</p>
                <p className="text-xs text-muted-foreground">Khan Academy - Cellular Respiration</p>
              </div>
              <span className="text-xs text-muted-foreground">2h ago</span>
            </div>
            
            <div className="p-4 flex items-center gap-4 hover:bg-accent transition-colors duration-200">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Layers className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Generated 12 flashcards</p>
                <p className="text-xs text-muted-foreground">From "Organic Chemistry Reactions"</p>
              </div>
              <span className="text-xs text-muted-foreground">5h ago</span>
            </div>
            
            <div className="p-4 flex items-center gap-4 hover:bg-accent transition-colors duration-200">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Download className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Exported note to PDF</p>
                <p className="text-xs text-muted-foreground">"World War II Summary"</p>
              </div>
              <span className="text-xs text-muted-foreground">1d ago</span>
            </div>
          </div>
        </Card>
      )}

      <NotesModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        template={selectedTemplate}
      />
    </div>
  );
}
