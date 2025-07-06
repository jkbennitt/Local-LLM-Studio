import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Lightbulb, 
  BookOpen, 
  ChevronDown, 
  Brain, 
  Sparkles,
  Info,
  CheckCircle,
  AlertCircle,
  Code,
  Eye
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface AdaptiveEducationProps {
  topic: string;
  context: string;
  userId?: number;
  currentAction?: string;
  className?: string;
}

interface EducationalContent {
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  prerequisites?: string[];
  learningObjectives: string[];
  content: ContentSection[];
  practicalTips?: string[];
  commonMistakes?: string[];
  nextSteps?: string[];
  adaptationReason?: string;
  alternativeExplanations?: ContentSection[];
  interactiveElements?: InteractiveElement[];
  progressCheckpoints?: ProgressCheckpoint[];
}

interface ContentSection {
  type: 'explanation' | 'example' | 'warning' | 'tip' | 'interactive';
  title?: string;
  content: string;
  code?: string;
  visualization?: any;
}

interface InteractiveElement {
  type: 'quiz' | 'experiment' | 'prediction';
  question: string;
  options?: string[];
  correctAnswer?: string;
  explanation: string;
  relatedConcept: string;
}

interface ProgressCheckpoint {
  concept: string;
  understood: boolean;
  confidenceLevel: number;
  revisitRecommended: boolean;
}

export default function AdaptiveEducation({ 
  topic, 
  context, 
  userId = 1,
  currentAction,
  className 
}: AdaptiveEducationProps) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [preferredView, setPreferredView] = useState<'simplified' | 'detailed'>('simplified');
  
  // Fetch adaptive content
  const { data: content, isLoading } = useQuery({
    queryKey: ['/api/education/content', topic, context, userId],
    queryFn: () => apiRequest(`/api/education/content/${topic}?userId=${userId}&context=${context}`)
  });
  
  // Fetch contextual tips
  const { data: tipsData } = useQuery({
    queryKey: ['/api/education/tips', userId, currentAction],
    queryFn: () => apiRequest(`/api/education/tips?userId=${userId}&action=${currentAction || 'general'}`),
    enabled: !!currentAction,
    refetchInterval: 30000 // Refresh every 30 seconds
  });
  
  // Track interactions
  const trackInteraction = useMutation({
    mutationFn: (data: any) => apiRequest('/api/education/track', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  });
  
  useEffect(() => {
    // Track that user viewed this content
    if (content) {
      trackInteraction.mutate({
        userId,
        action: `view_content_${topic}`,
        context: `${topic} - ${context}`,
        success: true,
        timeSpent: 0,
        errors: []
      });
    }
  }, [content, topic]);
  
  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'explanation': return <BookOpen className="w-4 h-4" />;
      case 'example': return <Code className="w-4 h-4" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'tip': return <Lightbulb className="w-4 h-4 text-blue-500" />;
      case 'interactive': return <Sparkles className="w-4 h-4 text-purple-500" />;
      default: return <Info className="w-4 h-4" />;
    }
  };
  
  const handleQuizAnswer = (answer: string, correctAnswer: string) => {
    setSelectedAnswer(answer);
    setShowAnswer(true);
    
    trackInteraction.mutate({
      userId,
      action: 'quiz_answer',
      context: topic,
      success: answer === correctAnswer,
      timeSpent: 10,
      errors: answer !== correctAnswer ? ['incorrect_answer'] : []
    });
  };
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!content) return null;
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Contextual Tips */}
      {tipsData?.tips && tipsData.tips.length > 0 && (
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              {tipsData.tips.map((tip: string, index: number) => (
                <p key={index} className="text-sm">{tip}</p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Main Educational Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                {content.title}
              </CardTitle>
              <CardDescription>{content.description}</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={getDifficultyColor(content.difficulty)}>
                {content.difficulty}
              </Badge>
              <span className="text-xs text-gray-500">{content.estimatedTime}</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={preferredView} onValueChange={(v) => setPreferredView(v as any)}>
            <TabsList className="mb-4">
              <TabsTrigger value="simplified">Simplified</TabsTrigger>
              <TabsTrigger value="detailed">Detailed</TabsTrigger>
            </TabsList>
            
            <TabsContent value="simplified" className="space-y-4">
              {/* Learning Objectives */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  What you'll learn
                </h4>
                <ul className="space-y-1">
                  {content.learningObjectives.map((objective, i) => (
                    <li key={i} className="text-sm text-gray-700 ml-6">• {objective}</li>
                  ))}
                </ul>
              </div>
              
              {/* Main Content Sections */}
              {content.content.slice(0, 3).map((section, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    {getSectionIcon(section.type)}
                    <div className="flex-1">
                      {section.title && (
                        <h4 className="font-medium mb-2">{section.title}</h4>
                      )}
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {section.content}
                      </p>
                      {section.code && (
                        <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                          <code>{section.code}</code>
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Practical Tips */}
              {content.practicalTips && content.practicalTips.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-green-600" />
                    Quick Tips
                  </h4>
                  <ul className="space-y-1">
                    {content.practicalTips.slice(0, 3).map((tip, i) => (
                      <li key={i} className="text-sm text-gray-700 ml-6">• {tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="detailed" className="space-y-4">
              {/* Prerequisites */}
              {content.prerequisites && content.prerequisites.length > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Prerequisites:</strong> {content.prerequisites.join(', ')}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* All Content Sections */}
              {content.content.map((section, index) => (
                <Collapsible
                  key={index}
                  open={expandedSections.has(index)}
                  onOpenChange={() => toggleSection(index)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        {getSectionIcon(section.type)}
                        <span className="font-medium">
                          {section.title || `${section.type} ${index + 1}`}
                        </span>
                      </div>
                      <ChevronDown className={cn(
                        "w-4 h-4 transition-transform",
                        expandedSections.has(index) && "rotate-180"
                      )} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-4 border-l-2 border-gray-200 ml-2">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {section.content}
                    </p>
                    {section.code && (
                      <pre className="mt-3 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                        <code>{section.code}</code>
                      </pre>
                    )}
                    {section.visualization && (
                      <div className="mt-3 p-3 bg-blue-50 rounded">
                        <Eye className="w-4 h-4 text-blue-600 mb-2" />
                        <p className="text-sm text-blue-700">
                          {section.visualization.description}
                        </p>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
              
              {/* Alternative Explanations */}
              {content.alternativeExplanations && content.alternativeExplanations.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Alternative Explanations</h4>
                  <div className="space-y-3">
                    {content.alternativeExplanations.map((alt, i) => (
                      <Card key={i} className="p-4">
                        <h5 className="font-medium text-sm mb-2">{alt.title}</h5>
                        <p className="text-sm text-gray-700">{alt.content}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          {/* Interactive Elements */}
          {content.interactiveElements && content.interactiveElements.length > 0 && (
            <div className="mt-6 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Test Your Understanding
              </h4>
              {content.interactiveElements.map((element, i) => (
                <Card key={i} className="p-4">
                  <p className="font-medium mb-3">{element.question}</p>
                  {element.type === 'quiz' && element.options && (
                    <div className="space-y-2">
                      {element.options.map((option, j) => (
                        <Button
                          key={j}
                          variant={
                            showAnswer && option === element.correctAnswer
                              ? "default"
                              : showAnswer && option === selectedAnswer
                              ? "destructive"
                              : "outline"
                          }
                          className="w-full justify-start"
                          onClick={() => handleQuizAnswer(option, element.correctAnswer!)}
                          disabled={showAnswer}
                        >
                          {option}
                        </Button>
                      ))}
                      {showAnswer && (
                        <Alert className="mt-3">
                          <Info className="h-4 w-4" />
                          <AlertDescription>{element.explanation}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
          
          {/* Progress Checkpoints */}
          {content.progressCheckpoints && content.progressCheckpoints.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">Your Progress</h4>
              <div className="space-y-2">
                {content.progressCheckpoints.map((checkpoint, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm">{checkpoint.concept}</span>
                    <div className="flex items-center gap-3">
                      <Progress value={checkpoint.confidenceLevel} className="w-20 h-2" />
                      {checkpoint.understood ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Adaptation Reason */}
          {content.adaptationReason && (
            <div className="mt-4 text-xs text-gray-500 italic">
              <Info className="w-3 h-3 inline mr-1" />
              {content.adaptationReason}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}