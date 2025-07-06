/**
 * Adaptive Educational Content System
 * Provides personalized learning experiences based on user skill level and behavior
 */

import { storage } from './storage';
import { EducationalContent, ContentSection } from './educational_content';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export interface UserProfile {
  userId: number;
  skillLevel: SkillLevel;
  interactionHistory: UserInteraction[];
  preferences: UserPreferences;
  knowledgeGaps: string[];
  strongAreas: string[];
  learningPace: 'slow' | 'moderate' | 'fast';
}

export interface UserInteraction {
  timestamp: Date;
  action: string;
  context: string;
  success: boolean;
  timeSpent: number;
  errorsEncountered: string[];
}

export interface UserPreferences {
  detailLevel: 'minimal' | 'balanced' | 'comprehensive';
  visualLearner: boolean;
  preferredExamples: 'code' | 'analogies' | 'both';
  technicalBackground: boolean;
}

export interface AdaptiveContent extends EducationalContent {
  adaptationReason: string;
  alternativeExplanations: ContentSection[];
  interactiveElements: InteractiveElement[];
  progressCheckpoints: ProgressCheckpoint[];
}

export interface InteractiveElement {
  type: 'quiz' | 'experiment' | 'prediction';
  question: string;
  options?: string[];
  correctAnswer?: string;
  explanation: string;
  relatedConcept: string;
}

export interface ProgressCheckpoint {
  concept: string;
  understood: boolean;
  confidenceLevel: number;
  revisitRecommended: boolean;
}

export class AdaptiveEducationSystem {
  private userProfiles: Map<number, UserProfile> = new Map();
  private conceptDependencies: Map<string, string[]> = new Map();
  private skillProgressionMap: Map<string, SkillLevel> = new Map();
  
  constructor() {
    this.initializeConceptDependencies();
    this.initializeSkillProgression();
  }
  
  /**
   * Initialize concept dependency graph
   */
  private initializeConceptDependencies() {
    // ML concepts and their prerequisites
    this.conceptDependencies.set('fine-tuning', ['pre-trained-models', 'transfer-learning']);
    this.conceptDependencies.set('transfer-learning', ['neural-networks', 'model-weights']);
    this.conceptDependencies.set('transformer-architecture', ['attention-mechanism', 'embeddings']);
    this.conceptDependencies.set('batch-size', ['memory-management', 'gradient-descent']);
    this.conceptDependencies.set('learning-rate', ['optimization', 'gradient-descent']);
    this.conceptDependencies.set('overfitting', ['training-validation-split', 'generalization']);
    this.conceptDependencies.set('tokenization', ['text-preprocessing', 'vocabulary']);
  }
  
  /**
   * Initialize skill progression mapping
   */
  private initializeSkillProgression() {
    // Map actions to skill levels
    this.skillProgressionMap.set('upload_first_dataset', 'beginner');
    this.skillProgressionMap.set('complete_first_training', 'beginner');
    this.skillProgressionMap.set('adjust_hyperparameters', 'intermediate');
    this.skillProgressionMap.set('compare_models', 'intermediate');
    this.skillProgressionMap.set('optimize_performance', 'advanced');
    this.skillProgressionMap.set('deploy_model', 'advanced');
  }
  
  /**
   * Get or create user profile
   */
  async getUserProfile(userId: number): Promise<UserProfile> {
    if (!this.userProfiles.has(userId)) {
      const profile = await this.createUserProfile(userId);
      this.userProfiles.set(userId, profile);
    }
    return this.userProfiles.get(userId)!;
  }
  
  /**
   * Create initial user profile based on onboarding
   */
  private async createUserProfile(userId: number): Promise<UserProfile> {
    // In production, would load from database
    return {
      userId,
      skillLevel: 'beginner',
      interactionHistory: [],
      preferences: {
        detailLevel: 'balanced',
        visualLearner: true,
        preferredExamples: 'both',
        technicalBackground: false
      },
      knowledgeGaps: [],
      strongAreas: [],
      learningPace: 'moderate'
    };
  }
  
  /**
   * Generate adaptive content based on user profile and context
   */
  async generateAdaptiveContent(
    userId: number,
    topic: string,
    context: string,
    baseContent?: EducationalContent
  ): Promise<AdaptiveContent> {
    const profile = await this.getUserProfile(userId);
    
    // Analyze user's current understanding
    const understanding = this.analyzeUserUnderstanding(profile, topic);
    
    // Get base content or generate new
    const content = baseContent || this.generateBaseContent(topic, profile.skillLevel);
    
    // Adapt content based on profile
    const adaptedContent = this.adaptContent(content, profile, understanding);
    
    // Add interactive elements
    const interactiveElements = this.generateInteractiveElements(topic, profile.skillLevel);
    
    // Create progress checkpoints
    const checkpoints = this.createProgressCheckpoints(topic, profile);
    
    // Generate alternative explanations
    const alternatives = this.generateAlternativeExplanations(topic, profile);
    
    return {
      ...adaptedContent,
      adaptationReason: this.explainAdaptation(profile, understanding),
      alternativeExplanations: alternatives,
      interactiveElements,
      progressCheckpoints: checkpoints
    };
  }
  
  /**
   * Analyze user's understanding of a topic
   */
  private analyzeUserUnderstanding(
    profile: UserProfile,
    topic: string
  ): {
    level: number; // 0-100
    gaps: string[];
    strengths: string[];
    readiness: boolean;
  } {
    // Check interaction history
    const relevantInteractions = profile.interactionHistory.filter(
      i => i.context.includes(topic)
    );
    
    // Calculate success rate
    const successRate = relevantInteractions.length > 0
      ? relevantInteractions.filter(i => i.success).length / relevantInteractions.length
      : 0;
    
    // Check prerequisites
    const prerequisites = this.conceptDependencies.get(topic) || [];
    const missingPrereqs = prerequisites.filter(
      prereq => !profile.strongAreas.includes(prereq)
    );
    
    // Analyze time spent and errors
    const avgTimeSpent = relevantInteractions.length > 0
      ? relevantInteractions.reduce((sum, i) => sum + i.timeSpent, 0) / relevantInteractions.length
      : 0;
    
    const commonErrors = this.findCommonErrors(relevantInteractions);
    
    return {
      level: Math.round(successRate * 100),
      gaps: [...missingPrereqs, ...commonErrors],
      strengths: profile.strongAreas.filter(area => prerequisites.includes(area)),
      readiness: missingPrereqs.length === 0 && successRate > 0.7
    };
  }
  
  /**
   * Adapt content based on user profile
   */
  private adaptContent(
    content: EducationalContent,
    profile: UserProfile,
    understanding: any
  ): EducationalContent {
    const adapted = { ...content };
    
    // Adjust difficulty
    if (profile.skillLevel === 'beginner') {
      adapted.difficulty = 'beginner';
      adapted.estimatedTime = this.adjustTimeEstimate(content.estimatedTime, 1.5);
    }
    
    // Modify content sections based on preferences
    adapted.content = content.content.map(section => {
      const modifiedSection = { ...section };
      
      // Add more visuals for visual learners
      if (profile.preferences.visualLearner && !section.visualization) {
        modifiedSection.visualization = this.generateVisualization(section.content);
      }
      
      // Adjust detail level
      if (profile.preferences.detailLevel === 'minimal') {
        modifiedSection.content = this.summarizeContent(section.content);
      } else if (profile.preferences.detailLevel === 'comprehensive') {
        modifiedSection.content = this.expandContent(section.content, profile);
      }
      
      // Add code examples if preferred
      if (profile.preferences.preferredExamples === 'code' && !section.code) {
        modifiedSection.code = this.generateCodeExample(section.title || '', profile.skillLevel);
      }
      
      return modifiedSection;
    });
    
    // Add prerequisite reminders if needed
    if (understanding.gaps.length > 0) {
      adapted.prerequisites = [
        ...(adapted.prerequisites || []),
        ...understanding.gaps.map(gap => `Review: ${this.formatConcept(gap)}`)
      ];
    }
    
    // Add encouragement for struggling users
    if (understanding.level < 50) {
      adapted.content.unshift({
        type: 'tip',
        title: 'You\'re doing great!',
        content: 'Learning ML takes time. This concept builds on previous knowledge, so don\'t worry if it feels challenging at first.'
      });
    }
    
    return adapted;
  }
  
  /**
   * Generate interactive elements for active learning
   */
  private generateInteractiveElements(
    topic: string,
    skillLevel: SkillLevel
  ): InteractiveElement[] {
    const elements: InteractiveElement[] = [];
    
    // Concept check quiz
    elements.push({
      type: 'quiz',
      question: this.generateConceptQuestion(topic, skillLevel),
      options: this.generateQuizOptions(topic, skillLevel),
      correctAnswer: this.getCorrectAnswer(topic),
      explanation: this.generateExplanation(topic, skillLevel),
      relatedConcept: topic
    });
    
    // Prediction exercise
    if (skillLevel !== 'beginner') {
      elements.push({
        type: 'prediction',
        question: `Based on what you've learned about ${this.formatConcept(topic)}, what would happen if you doubled the learning rate?`,
        explanation: this.generatePredictionExplanation(topic),
        relatedConcept: topic
      });
    }
    
    // Hands-on experiment
    elements.push({
      type: 'experiment',
      question: `Try changing the ${this.formatConcept(topic)} value and observe the results. What patterns do you notice?`,
      explanation: this.generateExperimentGuidance(topic, skillLevel),
      relatedConcept: topic
    });
    
    return elements;
  }
  
  /**
   * Track user interaction and update profile
   */
  async trackInteraction(
    userId: number,
    action: string,
    context: string,
    success: boolean,
    timeSpent: number,
    errors: string[] = []
  ) {
    const profile = await this.getUserProfile(userId);
    
    // Add interaction to history
    profile.interactionHistory.push({
      timestamp: new Date(),
      action,
      context,
      success,
      timeSpent,
      errorsEncountered: errors
    });
    
    // Keep only recent history (last 100 interactions)
    if (profile.interactionHistory.length > 100) {
      profile.interactionHistory = profile.interactionHistory.slice(-100);
    }
    
    // Update skill level based on achievements
    this.updateSkillLevel(profile, action, success);
    
    // Identify knowledge gaps and strengths
    this.updateKnowledgeProfile(profile, context, success, errors);
    
    // Adjust learning pace
    this.updateLearningPace(profile);
    
    // Save updated profile
    this.userProfiles.set(userId, profile);
  }
  
  /**
   * Update user's skill level based on actions
   */
  private updateSkillLevel(profile: UserProfile, action: string, success: boolean) {
    const requiredLevel = this.skillProgressionMap.get(action);
    if (!requiredLevel || !success) return;
    
    const levels: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];
    const currentIndex = levels.indexOf(profile.skillLevel);
    const requiredIndex = levels.indexOf(requiredLevel);
    
    // Progress if action indicates higher skill
    if (requiredIndex > currentIndex) {
      // Check if user has enough successful interactions at current level
      const recentSuccesses = profile.interactionHistory
        .slice(-20)
        .filter(i => i.success).length;
      
      if (recentSuccesses > 15) {
        profile.skillLevel = requiredLevel;
      }
    }
  }
  
  /**
   * Generate alternative explanations for different learning styles
   */
  private generateAlternativeExplanations(
    topic: string,
    profile: UserProfile
  ): ContentSection[] {
    const alternatives: ContentSection[] = [];
    
    // Analogy-based explanation
    alternatives.push({
      type: 'explanation',
      title: 'Think of it this way...',
      content: this.generateAnalogy(topic, profile.preferences.technicalBackground)
    });
    
    // Step-by-step breakdown
    alternatives.push({
      type: 'explanation',
      title: 'Step-by-step breakdown',
      content: this.generateStepByStep(topic, profile.skillLevel)
    });
    
    // Real-world example
    alternatives.push({
      type: 'example',
      title: 'Real-world application',
      content: this.generateRealWorldExample(topic, profile.preferences.technicalBackground)
    });
    
    return alternatives;
  }
  
  /**
   * Generate contextual tips based on user behavior
   */
  async generateContextualTips(
    userId: number,
    currentAction: string,
    currentState: any
  ): Promise<string[]> {
    const profile = await this.getUserProfile(userId);
    const tips: string[] = [];
    
    // Check recent errors
    const recentErrors = profile.interactionHistory
      .slice(-5)
      .flatMap(i => i.errorsEncountered);
    
    if (recentErrors.includes('batch_size_too_large')) {
      tips.push('💡 Try reducing the batch size to prevent memory errors. Start with 4 or 8.');
    }
    
    // Check if user is stuck
    const stuckOnSameAction = profile.interactionHistory
      .slice(-5)
      .filter(i => i.action === currentAction && !i.success).length > 3;
    
    if (stuckOnSameAction) {
      tips.push(`💡 Having trouble? ${this.getActionSpecificHelp(currentAction)}`);
    }
    
    // Provide proactive guidance
    if (profile.skillLevel === 'beginner' && currentAction === 'adjust_hyperparameters') {
      tips.push('💡 New to hyperparameters? Start by changing one at a time to see its effect.');
    }
    
    // Success encouragement
    const recentSuccesses = profile.interactionHistory
      .slice(-10)
      .filter(i => i.success).length;
    
    if (recentSuccesses > 7) {
      tips.push('🎉 You\'re on a roll! Ready to try something more advanced?');
    }
    
    return tips;
  }
  
  /**
   * Helper methods for content generation
   */
  
  private generateVisualization(content: string): any {
    // In production, would generate actual visualizations
    return {
      type: 'diagram',
      description: `Visual representation of: ${content.substring(0, 50)}...`
    };
  }
  
  private summarizeContent(content: string): string {
    // Simple summarization - in production would use NLP
    const sentences = content.split('. ');
    return sentences.slice(0, Math.ceil(sentences.length / 3)).join('. ') + '.';
  }
  
  private expandContent(content: string, profile: UserProfile): string {
    const expansion = profile.preferences.technicalBackground
      ? ' (Technical note: This relates to gradient descent optimization and backpropagation.)'
      : ' (In simple terms: This helps the model learn better from your data.)';
    
    return content + expansion;
  }
  
  private generateCodeExample(topic: string, skillLevel: SkillLevel): string {
    const examples: Record<string, Record<SkillLevel, string>> = {
      'batch-size': {
        beginner: '# Set batch size\nbatch_size = 8  # Process 8 examples at a time',
        intermediate: '# Optimize batch size for your GPU\nbatch_size = 16 if torch.cuda.is_available() else 8',
        advanced: '# Dynamic batch sizing\nbatch_size = calculate_optimal_batch_size(model_size, available_memory)'
      }
    };
    
    return examples[topic]?.[skillLevel] || '# Example code for ' + topic;
  }
  
  private formatConcept(concept: string): string {
    return concept.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  
  private adjustTimeEstimate(time: string, multiplier: number): string {
    const minutes = parseInt(time.split(' ')[0]);
    return `${Math.round(minutes * multiplier)} minutes`;
  }
  
  private findCommonErrors(interactions: UserInteraction[]): string[] {
    const errorCounts = new Map<string, number>();
    
    interactions.forEach(i => {
      i.errorsEncountered.forEach(error => {
        errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
      });
    });
    
    return Array.from(errorCounts.entries())
      .filter(([_, count]) => count > 2)
      .map(([error, _]) => error);
  }
  
  private generateConceptQuestion(topic: string, skillLevel: SkillLevel): string {
    const questions: Record<string, Record<SkillLevel, string>> = {
      'fine-tuning': {
        beginner: 'What is fine-tuning in machine learning?',
        intermediate: 'When would you choose fine-tuning over training from scratch?',
        advanced: 'How does the learning rate schedule affect fine-tuning performance?'
      }
    };
    
    return questions[topic]?.[skillLevel] || `What do you understand about ${this.formatConcept(topic)}?`;
  }
  
  private generateQuizOptions(topic: string, skillLevel: SkillLevel): string[] {
    // In production, would generate context-appropriate options
    return [
      'Option A: The correct answer',
      'Option B: A common misconception',
      'Option C: A related but different concept',
      'Option D: Another plausible option'
    ];
  }
  
  private getCorrectAnswer(topic: string): string {
    return 'Option A: The correct answer';
  }
  
  private generateExplanation(topic: string, skillLevel: SkillLevel): string {
    return `This is correct because ${this.formatConcept(topic)} works by...`;
  }
  
  private generatePredictionExplanation(topic: string): string {
    return `When you change ${this.formatConcept(topic)}, the model behavior changes because...`;
  }
  
  private generateExperimentGuidance(topic: string, skillLevel: SkillLevel): string {
    return `To experiment with ${this.formatConcept(topic)}, try these values and observe...`;
  }
  
  private generateAnalogy(topic: string, technical: boolean): string {
    const analogies: Record<string, { technical: string; simple: string }> = {
      'fine-tuning': {
        technical: 'Like adjusting the weights of a pre-calibrated instrument for a specific measurement task.',
        simple: 'Like teaching a skilled chef a new recipe - they already know how to cook, you\'re just showing them a new dish.'
      }
    };
    
    return analogies[topic]?.[technical ? 'technical' : 'simple'] || 
           `${this.formatConcept(topic)} is similar to...`;
  }
  
  private generateStepByStep(topic: string, skillLevel: SkillLevel): string {
    return `1. First, understand that ${this.formatConcept(topic)} is...\n` +
           `2. Next, consider how it affects...\n` +
           `3. Finally, apply it by...`;
  }
  
  private generateRealWorldExample(topic: string, technical: boolean): string {
    return technical
      ? `In production systems, ${this.formatConcept(topic)} is used for...`
      : `Imagine you're building an app that... This is where ${this.formatConcept(topic)} helps.`;
  }
  
  private explainAdaptation(profile: UserProfile, understanding: any): string {
    if (understanding.gaps.length > 0) {
      return `Content adapted to address knowledge gaps in: ${understanding.gaps.join(', ')}`;
    }
    if (profile.learningPace === 'slow') {
      return 'Content expanded with additional examples for thorough understanding';
    }
    if (profile.skillLevel === 'advanced') {
      return 'Advanced technical details included based on your expertise';
    }
    return 'Content personalized based on your learning history';
  }
  
  private createProgressCheckpoints(topic: string, profile: UserProfile): ProgressCheckpoint[] {
    const concepts = this.getTopicConcepts(topic);
    
    return concepts.map(concept => ({
      concept,
      understood: profile.strongAreas.includes(concept),
      confidenceLevel: this.calculateConfidence(profile, concept),
      revisitRecommended: profile.knowledgeGaps.includes(concept)
    }));
  }
  
  private getTopicConcepts(topic: string): string[] {
    const topicConcepts: Record<string, string[]> = {
      'model-training': ['epochs', 'batch-size', 'learning-rate', 'loss-function'],
      'fine-tuning': ['pre-trained-models', 'transfer-learning', 'domain-adaptation'],
      'deployment': ['model-optimization', 'inference', 'api-design', 'monitoring']
    };
    
    return topicConcepts[topic] || [topic];
  }
  
  private calculateConfidence(profile: UserProfile, concept: string): number {
    const relevantInteractions = profile.interactionHistory.filter(
      i => i.context.includes(concept)
    );
    
    if (relevantInteractions.length === 0) return 0;
    
    const successRate = relevantInteractions.filter(i => i.success).length / relevantInteractions.length;
    const recency = (Date.now() - relevantInteractions[relevantInteractions.length - 1].timestamp.getTime()) / (1000 * 60 * 60 * 24);
    
    // Decay confidence over time
    const timeDecay = Math.max(0, 1 - recency / 30); // 30 days
    
    return Math.round(successRate * timeDecay * 100);
  }
  
  private updateKnowledgeProfile(
    profile: UserProfile,
    context: string,
    success: boolean,
    errors: string[]
  ) {
    // Extract concepts from context
    const concepts = context.toLowerCase().split(/\s+/).filter(word => 
      this.isMLConcept(word)
    );
    
    concepts.forEach(concept => {
      if (success) {
        // Add to strong areas if consistently successful
        const recentSuccess = profile.interactionHistory
          .slice(-5)
          .filter(i => i.context.includes(concept) && i.success).length;
        
        if (recentSuccess >= 4 && !profile.strongAreas.includes(concept)) {
          profile.strongAreas.push(concept);
          // Remove from knowledge gaps if present
          profile.knowledgeGaps = profile.knowledgeGaps.filter(gap => gap !== concept);
        }
      } else {
        // Add to knowledge gaps if repeatedly failing
        const recentFailures = profile.interactionHistory
          .slice(-5)
          .filter(i => i.context.includes(concept) && !i.success).length;
        
        if (recentFailures >= 3 && !profile.knowledgeGaps.includes(concept)) {
          profile.knowledgeGaps.push(concept);
        }
      }
    });
  }
  
  private isMLConcept(word: string): boolean {
    const mlConcepts = new Set([
      'model', 'training', 'epoch', 'batch', 'learning', 'rate',
      'loss', 'accuracy', 'validation', 'overfitting', 'dataset',
      'fine-tuning', 'transformer', 'embedding', 'tokenization'
    ]);
    
    return mlConcepts.has(word);
  }
  
  private updateLearningPace(profile: UserProfile) {
    const recentInteractions = profile.interactionHistory.slice(-20);
    if (recentInteractions.length < 10) return;
    
    const avgTimeSpent = recentInteractions.reduce((sum, i) => sum + i.timeSpent, 0) / recentInteractions.length;
    const successRate = recentInteractions.filter(i => i.success).length / recentInteractions.length;
    
    if (avgTimeSpent > 600 && successRate < 0.5) {
      profile.learningPace = 'slow';
    } else if (avgTimeSpent < 300 && successRate > 0.8) {
      profile.learningPace = 'fast';
    } else {
      profile.learningPace = 'moderate';
    }
  }
  
  private getActionSpecificHelp(action: string): string {
    const helps: Record<string, string> = {
      'upload_dataset': 'Make sure your file is in CSV, JSON, or TXT format.',
      'start_training': 'Check that you\'ve selected both a template and dataset.',
      'adjust_hyperparameters': 'Try starting with the default values and change one at a time.',
      'test_model': 'Enter a prompt that matches your training data style.'
    };
    
    return helps[action] || 'Try checking the help section for guidance.';
  }
  
  private generateBaseContent(topic: string, skillLevel: SkillLevel): EducationalContent {
    return {
      title: this.formatConcept(topic),
      description: `Understanding ${topic} at ${skillLevel} level`,
      difficulty: skillLevel,
      estimatedTime: '10 minutes',
      learningObjectives: [`Understand ${topic}`, `Apply ${topic} in practice`],
      content: [{
        type: 'explanation',
        content: `Introduction to ${this.formatConcept(topic)}...`
      }]
    };
  }
}

// Export singleton instance
export const adaptiveEducation = new AdaptiveEducationSystem();