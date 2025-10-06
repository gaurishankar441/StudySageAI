import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Edit, Share2, Trash2 } from "lucide-react";
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
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">Note not found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            The note you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => navigate("/notes")}>
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

  // Parse content JSON
  const content = typeof note.content === 'object' ? note.content as any : {};

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/notes")}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Notes
        </Button>

        <div className={`h-40 bg-gradient-to-br ${gradientClass} rounded-xl p-6 flex flex-col justify-between mb-4`}>
          <div>
            <Badge className="bg-white/30 backdrop-blur-sm text-white text-xs mb-2">
              {note.template === 'cornell' ? 'Cornell Style' :
               note.template === 'lecture' ? 'Lecture Notes' :
               note.template === 'research' ? 'Research' :
               note.template === 'summary' ? 'Summary' :
               note.template === 'review' ? 'Review' :
               'Custom'}
            </Badge>
            <h1 className="text-3xl font-bold text-white">{note.title}</h1>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-sm">
              Updated {new Date(note.updatedAt!).toLocaleDateString()}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                data-testid="button-edit"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                data-testid="button-share"
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                data-testid="button-download"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Big Idea */}
        {content.bigIdea && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-3">Big Idea</h2>
              <p className="text-lg text-muted-foreground">{content.bigIdea}</p>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {content.summary && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-3">Summary</h2>
              <p className="text-muted-foreground">{content.summary}</p>
            </CardContent>
          </Card>
        )}

        {/* Key Terms */}
        {content.keyTerms && content.keyTerms.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Key Terms</h2>
              <div className="space-y-3">
                {content.keyTerms.map((term: any, index: number) => (
                  <div key={index} className="border-l-4 border-primary pl-4">
                    <h3 className="font-semibold">{term.term}</h3>
                    <p className="text-sm text-muted-foreground">{term.definition}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sections */}
        {content.sections && content.sections.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Detailed Notes</h2>
            {content.sections.map((section: any, index: number) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-3">{section.heading}</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{section.content}</p>
                  {section.examples && section.examples.length > 0 && (
                    <div className="mt-4 p-4 bg-accent rounded-lg">
                      <h4 className="font-medium mb-2">Examples:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {section.examples.map((example: string, i: number) => (
                          <li key={i} className="text-sm">{example}</li>
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
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Flashcards</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {content.flashcards.map((card: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <p className="font-medium mb-2">{card.front}</p>
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
