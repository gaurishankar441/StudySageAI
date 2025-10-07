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
  Sparkles,
} from "lucide-react";
import { Note } from "@shared/schema";

const templates = [
  {
    id: 'lecture',
    name: 'Record Lecture',
    icon: Mic,
    gradient: 'from-blue-400 to-cyan-500',
    description: 'Audio recording with live transcription',
  },
  {
    id: 'research',
    name: 'Research Paper',
    icon: GraduationCap,
    gradient: 'from-purple-400 to-pink-500',
    description: 'Structured academic writing format',
  },
  {
    id: 'review',
    name: 'Review Essay',
    icon: CheckSquare,
    gradient: 'from-green-400 to-emerald-500',
    description: 'Organized review and analysis',
  },
  {
    id: 'summary',
    name: 'Summarize Article',
    icon: List,
    gradient: 'from-amber-400 to-orange-500',
    description: 'Extract key points from content',
  },
  {
    id: 'blank',
    name: 'Blank Note',
    icon: Edit,
    gradient: 'from-gray-400 to-slate-500',
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
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-12 w-64 skeleton-shimmer rounded-lg mb-2" />
            <div className="h-6 w-96 skeleton-shimmer rounded" />
          </div>
          <div className="h-14 w-32 skeleton-shimmer rounded-lg" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={`glass-card rounded-xl p-6 shadow-md animate-fade-in-up stagger-${Math.min(i, 6)}`} data-testid={`skeleton-note-${i}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg skeleton-shimmer" />
                <div className="flex-1">
                  <div className="h-5 w-32 skeleton-shimmer rounded mb-2" />
                  <div className="h-4 w-24 skeleton-shimmer rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full skeleton-shimmer rounded" />
                <div className="h-4 w-5/6 skeleton-shimmer rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header with Gradient Text */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 gradient-text">Smart Notes</h1>
          <p className="text-muted-foreground text-lg">Create, organize and enhance your study notes with AI</p>
        </div>
        <Button
          onClick={() => {
            setSelectedTemplate("");
            setShowCreateModal(true);
          }}
          className="btn-gradient flex items-center gap-2 px-6 py-6 text-base"
          data-testid="button-new-note"
        >
          <Plus className="w-5 h-5" />
          New Note
        </Button>
      </div>

      {/* Templates Grid with Glass Cards */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-semibold gradient-text">Quick Start Templates</h2>
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {templates.map((template, index) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template.id)}
                className={`group p-6 rounded-2xl border-2 border-dashed border-border hover:border-transparent transition-all duration-300 text-center relative overflow-hidden animate-scale-in stagger-${Math.min(index + 1, 6)}`}
                data-testid={`template-${template.id}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${template.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${template.gradient} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <p className="font-semibold text-sm mb-2 group-hover:gradient-text transition-all">{template.name}</p>
                <p className="text-xs text-muted-foreground">{template.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Bar with Glass Effect */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold gradient-text">Recent Notes</h2>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="pl-12 w-96 h-12 glass-card border-0"
            data-testid="input-search-notes"
          />
        </div>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note, index) => {
            const TemplateIcon = getTemplateIcon(note.template || undefined);
            const gradientClass = getTemplateColor(note.template || undefined);
            
            return (
              <Card 
                key={note.id} 
                className={`card-interactive overflow-hidden group cursor-pointer animate-fade-in-up stagger-${Math.min((index % 6) + 1, 6)}`}
                onClick={() => navigate(`/notes/${note.id}`)}
                data-testid={`card-note-${note.id}`}
              >
                <div className={`h-40 bg-gradient-to-br ${gradientClass} p-6 flex items-end relative transition-transform duration-300 group-hover:scale-[1.02]`}>
                  <div className="absolute top-4 right-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white hover:bg-white/20 rounded-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <Badge className="bg-white/30 backdrop-blur-sm text-white text-xs mb-2 border-0">
                      {note.template === 'cornell' ? 'Cornell Style' :
                       note.template === 'lecture' ? 'Lecture Notes' :
                       note.template === 'research' ? 'Research' :
                       note.template === 'summary' ? 'Summary' :
                       note.template === 'review' ? 'Review' :
                       'Custom'}
                    </Badge>
                    <h4 className="font-bold text-white text-xl leading-tight">
                      {note.title}
                    </h4>
                  </div>
                </div>
                
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {typeof note.content === 'object' && note.content && 'summary' in (note.content as any)
                      ? (note.content as any).summary?.substring(0, 120) + '...'
                      : 'Study notes with key concepts and examples...'}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Updated {new Date(note.updatedAt!).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10">
                      <Layers className="w-3 h-3 text-primary" />
                      <span className="text-primary font-medium">12 cards</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="glass-card border-0 p-16 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-6">
            <NotebookPen className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-2xl font-semibold mb-3 gradient-text">
            {searchQuery ? 'No notes found' : 'No notes yet'}
          </h3>
          <p className="text-base text-muted-foreground mb-6 max-w-md mx-auto">
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
              className="btn-gradient flex items-center gap-2 px-6 py-6 text-base mx-auto"
            >
              <Plus className="w-5 h-5" />
              Create Your First Note
            </Button>
          )}
        </Card>
      )}

      {/* Recent Activity with Glass Effect */}
      {notes.length > 0 && (
        <Card className="glass-card border-0 mt-8">
          <div className="p-6 border-b border-border/50">
            <h3 className="text-xl font-semibold gradient-text">Recent Activity</h3>
          </div>
          <div className="divide-y divide-border/50">
            <div className="p-6 flex items-center gap-4 hover:bg-accent/30 transition-colors duration-200 cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Created note from YouTube video</p>
                <p className="text-xs text-muted-foreground">Khan Academy - Cellular Respiration</p>
              </div>
              <span className="text-xs text-muted-foreground">2h ago</span>
            </div>
            
            <div className="p-6 flex items-center gap-4 hover:bg-accent/30 transition-colors duration-200 cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Generated 12 flashcards</p>
                <p className="text-xs text-muted-foreground">From "Organic Chemistry Reactions"</p>
              </div>
              <span className="text-xs text-muted-foreground">5h ago</span>
            </div>
            
            <div className="p-6 flex items-center gap-4 hover:bg-accent/30 transition-colors duration-200 cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Exported note to PDF</p>
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
