import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Edit, Share2, Sparkles, BookOpen } from "lucide-react";
import { Note } from "@shared/schema";

export default function NoteDetail() {
  const [, params] = useRoute("/notes/:id");
  const [, navigate] = useLocation();
  const noteId = params?.id;

  const { data: note, isLoading } = useQuery<Note>({
    queryKey: ["/api/notes", noteId],
    enabled: !!noteId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <Card className="glass-card border-0 p-16 text-center">
          <h3 className="text-2xl font-semibold mb-3 gradient-text">Note not found</h3>
          <p className="text-base text-muted-foreground mb-6">
            The note you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => navigate("/notes")} className="btn-gradient">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Notes
          </Button>
        </Card>
      </div>
    );
  }

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

  const gradientClass = getTemplateColor(note.template || undefined);
  const content = typeof note.content === 'object' ? note.content as any : {};

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate("/notes")}
        className="mb-6 hover:bg-accent/50"
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Notes
      </Button>

      {/* Header Card with Gradient */}
      <Card className="glass-card border-0 overflow-hidden mb-8">
        <div className={`h-48 bg-gradient-to-br ${gradientClass} p-8 flex flex-col justify-between relative`}>
          <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent" />
          <div className="relative">
            <Badge className="bg-white/30 backdrop-blur-sm text-white text-xs mb-3 border-0 shadow-lg">
              {note.template === 'cornell' ? 'Cornell Style' :
               note.template === 'lecture' ? 'Lecture Notes' :
               note.template === 'research' ? 'Research' :
               note.template === 'summary' ? 'Summary' :
               note.template === 'review' ? 'Review' :
               'Custom'}
            </Badge>
            <h1 className="text-4xl font-bold text-white mb-2">{note.title}</h1>
            <p className="text-white/80">Last updated {new Date(note.updatedAt!).toLocaleDateString()}</p>
          </div>
          <div className="relative flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 backdrop-blur-sm border border-white/20"
              data-testid="button-edit"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 backdrop-blur-sm border border-white/20"
              data-testid="button-share"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 backdrop-blur-sm border border-white/20"
              data-testid="button-download"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Content Sections */}
      <div className="space-y-6">
        {/* Big Idea */}
        {content.bigIdea && (
          <Card className="glass-card border-0">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-semibold gradient-text">Big Idea</h2>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">{content.bigIdea}</p>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {content.summary && (
          <Card className="glass-card border-0">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-semibold gradient-text">Summary</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">{content.summary}</p>
            </CardContent>
          </Card>
        )}

        {/* Key Terms */}
        {content.keyTerms && content.keyTerms.length > 0 && (
          <Card className="glass-card border-0">
            <CardContent className="p-8">
              <h2 className="text-2xl font-semibold mb-6 gradient-text">Key Terms & Definitions</h2>
              <div className="space-y-4">
                {content.keyTerms.map((term: any, index: number) => (
                  <div key={index} className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border-l-4 border-primary">
                    <h3 className="font-bold text-lg mb-2">{term.term}</h3>
                    <p className="text-sm text-muted-foreground">{term.definition}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sections */}
        {content.sections && content.sections.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold gradient-text">Detailed Notes</h2>
            {content.sections.map((section: any, index: number) => (
              <Card key={index} className="glass-card border-0">
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold mb-4 gradient-text">{section.heading}</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed mb-4">{section.content}</p>
                  {section.examples && section.examples.length > 0 && (
                    <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-accent/50 to-accent/20 border border-border/50">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        Examples:
                      </h4>
                      <ul className="space-y-2">
                        {section.examples.map((example: string, i: number) => (
                          <li key={i} className="text-sm flex items-start gap-3">
                            <span className="text-primary mt-1">•</span>
                            <span>{example}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Flashcards */}
        {content.flashcards && content.flashcards.length > 0 && (
          <Card className="glass-card border-0">
            <CardContent className="p-8">
              <h2 className="text-2xl font-semibold mb-6 gradient-text">Flashcards</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {content.flashcards.map((card: any, index: number) => (
                  <div 
                    key={index} 
                    className="group p-6 rounded-2xl border-2 border-border hover:border-primary/50 bg-gradient-to-br from-accent/30 to-transparent hover:shadow-lg transition-all duration-300 cursor-pointer"
                  >
                    <p className="font-semibold mb-3 group-hover:gradient-text transition-all">{card.front}</p>
                    <p className="text-sm text-muted-foreground">{card.back}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
