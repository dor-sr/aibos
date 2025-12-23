/**
 * Meeting Scheduler
 * 
 * Manages meeting scheduling with calendar integration.
 */

import { createLogger } from '@aibos/core';
import type {
  Lead,
  MeetingRequest,
  MeetingType,
  MeetingStatus,
  MeetingAttendee,
  MeetingOutcome,
  ProposedTime,
  ScheduleMeetingInput,
} from '../types';

const logger = createLogger('sdr:scheduler');

// ============================================
// MEETING TEMPLATES
// ============================================

interface MeetingTemplate {
  type: MeetingType;
  title: string;
  description: string;
  duration: number;
  agenda: string[];
}

const MEETING_TEMPLATES: Record<MeetingType, MeetingTemplate> = {
  discovery_call: {
    type: 'discovery_call',
    title: 'Discovery Call - {company}',
    description: 'Initial conversation to understand your needs and see if we can help.',
    duration: 30,
    agenda: [
      'Introduction and background',
      'Current challenges and pain points',
      'Goals and success criteria',
      'Brief overview of our solution',
      'Next steps',
    ],
  },
  demo: {
    type: 'demo',
    title: 'Product Demo - {company}',
    description: 'Live demonstration of our platform tailored to your use case.',
    duration: 45,
    agenda: [
      'Quick recap of your needs',
      'Platform walkthrough',
      'Relevant use cases and features',
      'Q&A',
      'Discuss next steps',
    ],
  },
  qualification_call: {
    type: 'qualification_call',
    title: 'Qualification Call - {company}',
    description: 'Brief call to understand your requirements and timeline.',
    duration: 15,
    agenda: [
      'Confirm contact information',
      'Understand requirements',
      'Timeline and budget discussion',
      'Schedule next steps',
    ],
  },
  follow_up_call: {
    type: 'follow_up_call',
    title: 'Follow-up Call - {company}',
    description: 'Follow-up discussion to address any questions.',
    duration: 30,
    agenda: [
      'Address open questions',
      'Review additional information',
      'Discuss next steps',
    ],
  },
  technical_review: {
    type: 'technical_review',
    title: 'Technical Review - {company}',
    description: 'Deep dive into technical requirements and integrations.',
    duration: 60,
    agenda: [
      'Technical requirements review',
      'Integration capabilities',
      'Security and compliance',
      'Implementation timeline',
      'Q&A',
    ],
  },
  proposal_review: {
    type: 'proposal_review',
    title: 'Proposal Review - {company}',
    description: 'Review of custom proposal and pricing.',
    duration: 30,
    agenda: [
      'Proposal walkthrough',
      'Pricing discussion',
      'Terms review',
      'Questions and next steps',
    ],
  },
  intro_to_ae: {
    type: 'intro_to_ae',
    title: 'Introduction to Account Executive - {company}',
    description: 'Handoff meeting with your dedicated Account Executive.',
    duration: 30,
    agenda: [
      'Introduction to Account Executive',
      'Summary of discussions to date',
      'Next steps in evaluation process',
    ],
  },
  custom: {
    type: 'custom',
    title: 'Meeting - {company}',
    description: 'Meeting to discuss your requirements.',
    duration: 30,
    agenda: [],
  },
};

// ============================================
// MEETING SCHEDULER CLASS
// ============================================

export interface MeetingSchedulerConfig {
  defaultDuration: number;
  bufferMinutes: number;
  advanceNoticeDays: number;
  maxProposedTimes: number;
  timezone: string;
  businessHoursStart: string;
  businessHoursEnd: string;
  businessDays: number[];
  preferredTimes: string[];
  defaultLocationType: MeetingRequest['locationType'];
  videoConferenceProvider?: string;
}

export class MeetingScheduler {
  private config: MeetingSchedulerConfig;
  private meetings: Map<string, MeetingRequest> = new Map();
  private calendarAvailability: Map<string, Date[]> = new Map(); // SDR availability

  constructor(config?: Partial<MeetingSchedulerConfig>) {
    this.config = {
      defaultDuration: 30,
      bufferMinutes: 15,
      advanceNoticeDays: 1,
      maxProposedTimes: 5,
      timezone: 'America/New_York',
      businessHoursStart: '09:00',
      businessHoursEnd: '17:00',
      businessDays: [1, 2, 3, 4, 5],
      preferredTimes: ['10:00', '14:00', '15:00'],
      defaultLocationType: 'video',
      ...config,
    };
  }

  // ============================================
  // MEETING CREATION
  // ============================================

  /**
   * Request a meeting
   */
  requestMeeting(
    input: ScheduleMeetingInput,
    sdrEmployeeId: string,
    lead: Lead
  ): MeetingRequest {
    const id = `meeting_${Date.now()}_${lead.id}`;
    const now = new Date();
    const template = MEETING_TEMPLATES[input.type];

    // Generate title
    const title = input.title || template.title.replace('{company}', lead.company);
    const description = input.description || template.description;
    const duration = input.duration || template.duration;

    // Generate proposed times if not provided
    const proposedTimes = input.proposedTimes.length > 0
      ? input.proposedTimes
      : this.generateProposedTimes(duration);

    // Create attendees list
    const attendees: MeetingAttendee[] = [
      {
        email: lead.email,
        name: lead.name,
        role: 'required',
        responseStatus: 'pending',
      },
      ...(input.additionalAttendees || []),
    ];

    const meeting: MeetingRequest = {
      id,
      leadId: lead.id,
      sdrEmployeeId,
      type: input.type,
      title,
      description,
      requestedAt: now,
      proposedTimes,
      duration,
      timezone: this.config.timezone,
      locationType: input.locationType || this.config.defaultLocationType,
      attendees,
      status: 'pending',
      reminderSent: false,
      createdAt: now,
      updatedAt: now,
    };

    this.meetings.set(id, meeting);

    logger.info('Meeting requested', {
      meetingId: id,
      leadId: lead.id,
      type: input.type,
      proposedTimes: proposedTimes.length,
    });

    return meeting;
  }

  /**
   * Generate proposed meeting times
   */
  generateProposedTimes(duration: number): ProposedTime[] {
    const times: ProposedTime[] = [];
    const now = new Date();
    const minDate = new Date(now);
    minDate.setDate(minDate.getDate() + this.config.advanceNoticeDays);

    // Start from next business day
    let currentDate = new Date(minDate);
    while (!this.config.businessDays.includes(currentDate.getDay())) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Generate times for the next 5 business days
    let daysChecked = 0;
    while (times.length < this.config.maxProposedTimes && daysChecked < 10) {
      if (this.config.businessDays.includes(currentDate.getDay())) {
        // Check each preferred time
        for (const preferredTime of this.config.preferredTimes) {
          if (times.length >= this.config.maxProposedTimes) break;

          const timeParts = preferredTime.split(':').map(Number);
          const hours = timeParts[0] ?? 9;
          const minutes = timeParts[1] ?? 0;
          const startTime = new Date(currentDate);
          startTime.setHours(hours, minutes, 0, 0);

          const endTime = new Date(startTime);
          endTime.setMinutes(endTime.getMinutes() + duration);

          // Check if within business hours
          const endHourParts = this.config.businessHoursEnd.split(':').map(Number);
          const endHour = endHourParts[0] ?? 17;
          if (endTime.getHours() <= endHour) {
            // Check availability (in real impl, would check calendar)
            times.push({
              start: startTime,
              end: endTime,
              isPreferred: preferredTime === this.config.preferredTimes[0],
            });
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
      daysChecked++;
    }

    return times;
  }

  /**
   * Get available slots for date range
   */
  getAvailableSlots(
    startDate: Date,
    endDate: Date,
    duration: number
  ): ProposedTime[] {
    const slots: ProposedTime[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      if (this.config.businessDays.includes(currentDate.getDay())) {
        const startParts = this.config.businessHoursStart.split(':').map(Number);
        const endParts = this.config.businessHoursEnd.split(':').map(Number);
        const startHour = startParts[0] ?? 9;
        const startMin = startParts[1] ?? 0;
        const endHour = endParts[0] ?? 17;
        const endMin = endParts[1] ?? 0;

        const dayStart = new Date(currentDate);
        dayStart.setHours(startHour, startMin, 0, 0);

        const dayEnd = new Date(currentDate);
        dayEnd.setHours(endHour, endMin, 0, 0);

        // Generate slots every 30 minutes
        const slot = new Date(dayStart);
        while (slot.getTime() + duration * 60 * 1000 <= dayEnd.getTime()) {
          const slotEnd = new Date(slot);
          slotEnd.setMinutes(slotEnd.getMinutes() + duration);

          // In real impl, would check calendar for conflicts
          slots.push({
            start: new Date(slot),
            end: slotEnd,
          });

          slot.setMinutes(slot.getMinutes() + 30);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  // ============================================
  // MEETING MANAGEMENT
  // ============================================

  /**
   * Get meeting by ID
   */
  getMeeting(id: string): MeetingRequest | undefined {
    return this.meetings.get(id);
  }

  /**
   * Get meetings for lead
   */
  getLeadMeetings(leadId: string): MeetingRequest[] {
    return Array.from(this.meetings.values())
      .filter(m => m.leadId === leadId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  /**
   * Get SDR meetings
   */
  getSDRMeetings(
    sdrEmployeeId: string,
    options?: {
      status?: MeetingStatus;
      startDate?: Date;
      endDate?: Date;
    }
  ): MeetingRequest[] {
    return Array.from(this.meetings.values())
      .filter(m => {
        if (m.sdrEmployeeId !== sdrEmployeeId) return false;
        if (options?.status && m.status !== options.status) return false;
        if (options?.startDate && m.selectedTime && m.selectedTime < options.startDate) return false;
        if (options?.endDate && m.selectedTime && m.selectedTime > options.endDate) return false;
        return true;
      })
      .sort((a, b) => {
        const aTime = a.selectedTime || a.requestedAt;
        const bTime = b.selectedTime || b.requestedAt;
        return aTime.getTime() - bTime.getTime();
      });
  }

  /**
   * Get upcoming meetings
   */
  getUpcomingMeetings(sdrEmployeeId: string, days: number = 7): MeetingRequest[] {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + days);

    return this.getSDRMeetings(sdrEmployeeId, {
      status: 'confirmed',
      startDate: now,
      endDate,
    });
  }

  /**
   * Confirm meeting with selected time
   */
  confirmMeeting(
    meetingId: string,
    selectedTime: Date,
    videoLink?: string
  ): MeetingRequest | null {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return null;

    meeting.status = 'confirmed';
    meeting.selectedTime = selectedTime;
    meeting.confirmedAt = new Date();
    meeting.videoLink = videoLink;
    meeting.updatedAt = new Date();

    // Update attendee status
    for (const attendee of meeting.attendees) {
      attendee.responseStatus = 'accepted';
    }

    logger.info('Meeting confirmed', {
      meetingId,
      selectedTime: selectedTime.toISOString(),
    });

    return meeting;
  }

  /**
   * Reschedule meeting
   */
  rescheduleMeeting(
    meetingId: string,
    newProposedTimes: ProposedTime[]
  ): MeetingRequest | null {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return null;

    meeting.rescheduledFrom = meeting.selectedTime?.toISOString();
    meeting.status = 'rescheduled';
    meeting.proposedTimes = newProposedTimes;
    meeting.selectedTime = undefined;
    meeting.confirmedAt = undefined;
    meeting.updatedAt = new Date();

    logger.info('Meeting rescheduled', {
      meetingId,
      previousTime: meeting.rescheduledFrom,
    });

    return meeting;
  }

  /**
   * Cancel meeting
   */
  cancelMeeting(meetingId: string, reason?: string): MeetingRequest | null {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return null;

    meeting.status = 'cancelled';
    meeting.cancelledAt = new Date();
    meeting.cancellationReason = reason;
    meeting.updatedAt = new Date();

    logger.info('Meeting cancelled', {
      meetingId,
      reason,
    });

    return meeting;
  }

  /**
   * Record meeting outcome
   */
  recordOutcome(meetingId: string, outcome: MeetingOutcome): MeetingRequest | null {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return null;

    meeting.status = outcome.happened ? 'completed' : 'no_show';
    meeting.outcome = outcome;
    meeting.updatedAt = new Date();

    logger.info('Meeting outcome recorded', {
      meetingId,
      happened: outcome.happened,
      noShowBy: outcome.noShowBy,
    });

    return meeting;
  }

  // ============================================
  // REMINDERS
  // ============================================

  /**
   * Get meetings needing reminders
   */
  getMeetingsNeedingReminders(
    hoursBeforeReminder: number = 24
  ): MeetingRequest[] {
    const now = new Date();
    const reminderCutoff = new Date(now);
    reminderCutoff.setHours(reminderCutoff.getHours() + hoursBeforeReminder);

    return Array.from(this.meetings.values())
      .filter(m => 
        m.status === 'confirmed' &&
        !m.reminderSent &&
        m.selectedTime &&
        m.selectedTime <= reminderCutoff &&
        m.selectedTime > now
      );
  }

  /**
   * Mark reminder sent
   */
  markReminderSent(meetingId: string): void {
    const meeting = this.meetings.get(meetingId);
    if (meeting) {
      meeting.reminderSent = true;
      meeting.reminderSentAt = new Date();
      meeting.updatedAt = new Date();
    }
  }

  // ============================================
  // CALENDAR INTEGRATION
  // ============================================

  /**
   * Sync with external calendar
   */
  async syncWithCalendar(
    sdrEmployeeId: string,
    calendarEvents: Array<{ start: Date; end: Date; eventId: string }>
  ): Promise<void> {
    // Store busy times
    const busyTimes = calendarEvents.map(e => e.start);
    this.calendarAvailability.set(sdrEmployeeId, busyTimes);

    logger.info('Calendar synced', {
      sdrEmployeeId,
      eventsCount: calendarEvents.length,
    });
  }

  /**
   * Create calendar event
   */
  generateCalendarEvent(meeting: MeetingRequest): {
    title: string;
    description: string;
    start: Date;
    end: Date;
    attendees: string[];
    location?: string;
  } | null {
    if (!meeting.selectedTime) return null;

    const end = new Date(meeting.selectedTime);
    end.setMinutes(end.getMinutes() + meeting.duration);

    let location: string | undefined;
    if (meeting.locationType === 'video' && meeting.videoLink) {
      location = meeting.videoLink;
    } else if (meeting.locationType === 'phone' && meeting.phoneNumber) {
      location = `Phone: ${meeting.phoneNumber}`;
    } else if (meeting.locationType === 'in_person' && meeting.address) {
      location = meeting.address;
    }

    const template = MEETING_TEMPLATES[meeting.type];
    const description = [
      meeting.description || template.description,
      '',
      'Agenda:',
      ...template.agenda.map((item, i) => `${i + 1}. ${item}`),
    ].join('\n');

    return {
      title: meeting.title,
      description,
      start: meeting.selectedTime,
      end,
      attendees: meeting.attendees.map(a => a.email),
      location,
    };
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get meeting statistics
   */
  getStats(sdrEmployeeId?: string): {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    noShow: number;
    showRate: number;
    avgTimeToConfirm: number;
    byType: Record<MeetingType, number>;
  } {
    let meetings = Array.from(this.meetings.values());
    
    if (sdrEmployeeId) {
      meetings = meetings.filter(m => m.sdrEmployeeId === sdrEmployeeId);
    }

    const completed = meetings.filter(m => m.status === 'completed').length;
    const noShow = meetings.filter(m => m.status === 'no_show').length;
    const scheduledAndPast = completed + noShow;

    const byType: Record<string, number> = {};
    let totalTimeToConfirm = 0;
    let confirmedCount = 0;

    for (const meeting of meetings) {
      byType[meeting.type] = (byType[meeting.type] || 0) + 1;

      if (meeting.confirmedAt) {
        totalTimeToConfirm += meeting.confirmedAt.getTime() - meeting.requestedAt.getTime();
        confirmedCount++;
      }
    }

    return {
      total: meetings.length,
      pending: meetings.filter(m => m.status === 'pending' || m.status === 'proposed').length,
      confirmed: meetings.filter(m => m.status === 'confirmed').length,
      completed,
      cancelled: meetings.filter(m => m.status === 'cancelled').length,
      noShow,
      showRate: scheduledAndPast > 0 ? completed / scheduledAndPast : 0,
      avgTimeToConfirm: confirmedCount > 0 
        ? totalTimeToConfirm / confirmedCount / (1000 * 60 * 60) // Hours
        : 0,
      byType: byType as Record<MeetingType, number>,
    };
  }

  /**
   * Get meeting template
   */
  getMeetingTemplate(type: MeetingType): MeetingTemplate {
    return MEETING_TEMPLATES[type];
  }
}

/**
 * Create meeting scheduler
 */
export function createMeetingScheduler(
  config?: Partial<MeetingSchedulerConfig>
): MeetingScheduler {
  return new MeetingScheduler(config);
}

