/**
 * Employee Persona System
 * 
 * Manages employee identity, personality, and presentation.
 */

import { createLogger } from '@aibos/core';
import type {
  PersonaConfig,
  PersonalityTraits,
  EmployeeType,
  CommunicationChannel,
} from '../types';

const logger = createLogger('employee:persona');

// Default personalities for each employee type
const DEFAULT_PERSONALITIES: Record<EmployeeType, PersonalityTraits> = {
  project_manager: {
    formality: 'professional',
    verbosity: 'balanced',
    tone: 'friendly',
    emoji_usage: 'minimal',
  },
  customer_success: {
    formality: 'professional',
    verbosity: 'detailed',
    tone: 'friendly',
    emoji_usage: 'moderate',
  },
  sales_dev: {
    formality: 'professional',
    verbosity: 'concise',
    tone: 'friendly',
    emoji_usage: 'minimal',
  },
  support: {
    formality: 'professional',
    verbosity: 'detailed',
    tone: 'friendly',
    emoji_usage: 'minimal',
  },
  executive_assistant: {
    formality: 'formal',
    verbosity: 'concise',
    tone: 'neutral',
    emoji_usage: 'none',
  },
};

// Default names for employee types
const DEFAULT_NAMES: Record<EmployeeType, string> = {
  project_manager: 'Alex',
  customer_success: 'Jordan',
  sales_dev: 'Taylor',
  support: 'Casey',
  executive_assistant: 'Morgan',
};

// Default titles for employee types
const DEFAULT_TITLES: Record<EmployeeType, string> = {
  project_manager: 'AI Project Manager',
  customer_success: 'AI Customer Success Manager',
  sales_dev: 'AI Sales Development Representative',
  support: 'AI Support Specialist',
  executive_assistant: 'AI Executive Assistant',
};

/**
 * Create a default persona configuration for an employee type
 */
export function createDefaultPersona(type: EmployeeType): PersonaConfig {
  return {
    name: DEFAULT_NAMES[type],
    title: DEFAULT_TITLES[type],
    personality: { ...DEFAULT_PERSONALITIES[type] },
    workingHours: {
      timezone: 'UTC',
      start: '09:00',
      end: '18:00',
      workDays: [1, 2, 3, 4, 5], // Monday to Friday
    },
    responseTimeTarget: 5, // 5 minutes
  };
}

/**
 * Merge a partial persona with defaults
 */
export function mergePersona(
  type: EmployeeType,
  partial: Partial<PersonaConfig>
): PersonaConfig {
  const defaults = createDefaultPersona(type);
  
  return {
    ...defaults,
    ...partial,
    personality: {
      ...defaults.personality,
      ...(partial.personality || {}),
    },
    workingHours: partial.workingHours || defaults.workingHours,
  };
}

/**
 * Persona Manager class
 */
export class PersonaManager {
  private persona: PersonaConfig;
  private employeeType: EmployeeType;

  constructor(type: EmployeeType, persona: PersonaConfig) {
    this.employeeType = type;
    this.persona = persona;
  }

  /**
   * Get the employee's display name
   */
  getName(): string {
    return this.persona.name;
  }

  /**
   * Get the employee's title
   */
  getTitle(): string {
    return this.persona.title;
  }

  /**
   * Get the full display string (Name, Title)
   */
  getDisplayName(): string {
    return `${this.persona.name}, ${this.persona.title}`;
  }

  /**
   * Get the avatar URL
   */
  getAvatarUrl(): string | undefined {
    return this.persona.avatarUrl;
  }

  /**
   * Get the email signature
   */
  getSignature(): string {
    if (this.persona.signature) {
      return this.persona.signature;
    }

    // Generate default signature
    return `Best regards,\n${this.persona.name}\n${this.persona.title}`;
  }

  /**
   * Get personality traits
   */
  getPersonality(): PersonalityTraits {
    return this.persona.personality;
  }

  /**
   * Check if employee is within working hours
   */
  isWithinWorkingHours(date: Date = new Date()): boolean {
    const { workingHours } = this.persona;
    if (!workingHours) return true;

    // Convert to employee's timezone
    const options: Intl.DateTimeFormatOptions = {
      timeZone: workingHours.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      weekday: 'short',
    };

    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(date);
    
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const dayName = parts.find(p => p.type === 'weekday')?.value || '';
    
    // Map day name to number
    const dayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };
    const dayNumber = dayMap[dayName] ?? 0;

    // Check if it's a work day
    if (!workingHours.workDays.includes(dayNumber)) {
      return false;
    }

    // Parse working hours
    const startParts = workingHours.start.split(':').map(Number);
    const endParts = workingHours.end.split(':').map(Number);
    const startHour = startParts[0] ?? 0;
    const startMin = startParts[1] ?? 0;
    const endHour = endParts[0] ?? 0;
    const endMin = endParts[1] ?? 0;

    const currentMinutes = hour * 60 + minute;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  /**
   * Format a message according to personality
   */
  formatMessage(content: string, channel: CommunicationChannel): string {
    const { personality } = this.persona;
    let formatted = content;

    // Adjust formality
    if (personality.formality === 'casual') {
      formatted = this.casualize(formatted);
    } else if (personality.formality === 'formal') {
      formatted = this.formalize(formatted);
    }

    // Handle emoji based on preference and channel
    if (personality.emoji_usage === 'none') {
      formatted = this.removeEmojis(formatted);
    }

    // Channel-specific adjustments
    if (channel === 'email') {
      // Emails should be more formal by default
      if (personality.formality !== 'casual') {
        formatted = this.addEmailStructure(formatted);
      }
    } else if (channel === 'slack') {
      // Slack can be more casual
      formatted = this.formatForSlack(formatted);
    }

    return formatted;
  }

  /**
   * Generate a greeting based on personality and context
   */
  generateGreeting(contactName: string, timeOfDay: 'morning' | 'afternoon' | 'evening' = 'afternoon'): string {
    const { personality } = this.persona;

    const greetings = {
      casual: {
        morning: [`Hey ${contactName}!`, `Morning ${contactName}!`, `Hi ${contactName}!`],
        afternoon: [`Hey ${contactName}!`, `Hi ${contactName}!`, `What's up ${contactName}?`],
        evening: [`Hey ${contactName}!`, `Hi ${contactName}!`, `Evening ${contactName}!`],
      },
      professional: {
        morning: [`Good morning ${contactName},`, `Hi ${contactName},`, `Hello ${contactName},`],
        afternoon: [`Hi ${contactName},`, `Hello ${contactName},`, `Good afternoon ${contactName},`],
        evening: [`Good evening ${contactName},`, `Hi ${contactName},`, `Hello ${contactName},`],
      },
      formal: {
        morning: [`Good morning ${contactName},`, `Dear ${contactName},`],
        afternoon: [`Good afternoon ${contactName},`, `Dear ${contactName},`],
        evening: [`Good evening ${contactName},`, `Dear ${contactName},`],
      },
    };

    const formalityGreetings = greetings[personality.formality];
    const options = formalityGreetings[timeOfDay];
    return options[Math.floor(Math.random() * options.length)] ?? `Hello ${contactName},`;
  }

  /**
   * Generate a sign-off based on personality
   */
  generateSignOff(): string {
    const { personality } = this.persona;

    const signOffs = {
      casual: ['Cheers,', 'Thanks!', 'Talk soon,', 'Best,'],
      professional: ['Best regards,', 'Thank you,', 'Best,', 'Regards,'],
      formal: ['Sincerely,', 'Best regards,', 'Respectfully,', 'Kind regards,'],
    };

    const options = signOffs[personality.formality];
    return options[Math.floor(Math.random() * options.length)] ?? 'Best regards,';
  }

  // Private helper methods

  private casualize(text: string): string {
    // Replace formal phrases with casual ones
    return text
      .replace(/I would like to/gi, "I'd like to")
      .replace(/Please let me know/gi, 'Let me know')
      .replace(/I am/gi, "I'm")
      .replace(/We are/gi, "We're")
      .replace(/It is/gi, "It's");
  }

  private formalize(text: string): string {
    // Replace casual phrases with formal ones
    return text
      .replace(/gonna/gi, 'going to')
      .replace(/wanna/gi, 'want to')
      .replace(/gotta/gi, 'have to')
      .replace(/y'all/gi, 'you all')
      .replace(/hey\b/gi, 'Hello');
  }

  private removeEmojis(text: string): string {
    // Remove common emojis
    return text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').replace(/\s+/g, ' ').trim();
  }

  private addEmailStructure(text: string): string {
    // Add proper paragraph spacing for emails
    return text.split('\n\n').join('\n\n');
  }

  private formatForSlack(text: string): string {
    // Convert markdown to Slack format
    return text
      .replace(/\*\*(.*?)\*\*/g, '*$1*') // Bold
      .replace(/__(.*?)__/g, '_$1_'); // Italic
  }

  /**
   * Update persona configuration
   */
  updatePersona(updates: Partial<PersonaConfig>): void {
    this.persona = {
      ...this.persona,
      ...updates,
      personality: {
        ...this.persona.personality,
        ...(updates.personality || {}),
      },
    };

    logger.info('Persona updated', {
      name: this.persona.name,
      type: this.employeeType,
    });
  }

  /**
   * Export persona configuration
   */
  toJSON(): PersonaConfig {
    return { ...this.persona };
  }
}

/**
 * Create a persona manager
 */
export function createPersonaManager(
  type: EmployeeType,
  persona: PersonaConfig
): PersonaManager {
  return new PersonaManager(type, persona);
}

