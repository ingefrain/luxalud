import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parse, addMinutes, isBefore, isAfter, startOfDay } from "date-fns";
import type { Schedule, ScheduleBlock } from "@/lib/types";

interface UseAvailableSlotsParams {
  doctorId: string | undefined;
  date: Date | undefined;
  duration: number;
}

export function useAvailableSlots({ doctorId, date, duration }: UseAvailableSlotsParams) {
  return useQuery({
    queryKey: ["available-slots", doctorId, date?.toISOString(), duration],
    queryFn: async () => {
      if (!doctorId || !date) return [];

      const dateStr = format(date, "yyyy-MM-dd");
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

      // Fetch doctor's schedule for this day
      const { data: schedules, error: schedulesError } = await supabase
        .from("schedules")
        .select("*")
        .eq("doctor_id", doctorId)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true);

      if (schedulesError) throw schedulesError;
      if (!schedules || schedules.length === 0) return [];

      // Fetch existing appointments for this date
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("start_time, end_time")
        .eq("doctor_id", doctorId)
        .eq("appointment_date", dateStr)
        .neq("status", "cancelada");

      if (appointmentsError) throw appointmentsError;

      // Fetch schedule blocks that overlap with this date
      const startOfDate = new Date(date);
      startOfDate.setHours(0, 0, 0, 0);
      const endOfDate = new Date(date);
      endOfDate.setHours(23, 59, 59, 999);

      const { data: blocks, error: blocksError } = await supabase
        .from("schedule_blocks")
        .select("*")
        .eq("doctor_id", doctorId)
        .lte("start_datetime", endOfDate.toISOString())
        .gte("end_datetime", startOfDate.toISOString());

      if (blocksError) throw blocksError;

      // Generate all possible slots from schedules
      const allSlots: string[] = [];
      
      for (const schedule of schedules as Schedule[]) {
        const startTime = parse(schedule.start_time, "HH:mm:ss", new Date());
        const endTime = parse(schedule.end_time, "HH:mm:ss", new Date());
        const slotDuration = schedule.slot_duration;

        let currentSlot = startTime;
        while (isBefore(addMinutes(currentSlot, duration), endTime) || 
               format(addMinutes(currentSlot, duration), "HH:mm") === format(endTime, "HH:mm")) {
          allSlots.push(format(currentSlot, "HH:mm"));
          currentSlot = addMinutes(currentSlot, slotDuration);
        }
      }

      // Filter out occupied slots
      const occupiedSlots = new Set<string>();

      // Mark slots occupied by appointments
      for (const apt of (appointments || [])) {
        const aptStart = parse(apt.start_time, "HH:mm:ss", new Date());
        const aptEnd = parse(apt.end_time, "HH:mm:ss", new Date());
        
        for (const slot of allSlots) {
          const slotStart = parse(slot, "HH:mm", new Date());
          const slotEnd = addMinutes(slotStart, duration);
          
          // Check if this slot overlaps with the appointment
          if (isBefore(slotStart, aptEnd) && isAfter(slotEnd, aptStart)) {
            occupiedSlots.add(slot);
          }
        }
      }

      // Mark slots occupied by blocks
      for (const block of (blocks || []) as ScheduleBlock[]) {
        const blockStart = new Date(block.start_datetime);
        const blockEnd = new Date(block.end_datetime);
        
        for (const slot of allSlots) {
          const slotDateTime = new Date(date);
          const [hours, minutes] = slot.split(":").map(Number);
          slotDateTime.setHours(hours, minutes, 0, 0);
          const slotEndDateTime = addMinutes(slotDateTime, duration);
          
          // Check if this slot overlaps with the block
          if (isBefore(slotDateTime, blockEnd) && isAfter(slotEndDateTime, blockStart)) {
            occupiedSlots.add(slot);
          }
        }
      }

      // Filter out past times if date is today
      const now = new Date();
      const isToday = format(date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");

      const availableSlots = allSlots.filter((slot) => {
        if (occupiedSlots.has(slot)) return false;
        
        // Only allow 30-minute interval slots (HH:00 or HH:30)
        const [, minutes] = slot.split(":").map(Number);
        if (minutes !== 0 && minutes !== 30) return false;
        
        if (isToday) {
          const slotTime = parse(slot, "HH:mm", new Date());
          const slotDateTime = new Date(date);
          slotDateTime.setHours(slotTime.getHours(), slotTime.getMinutes(), 0, 0);
          if (isBefore(slotDateTime, now)) return false;
        }
        
        return true;
      });

      return availableSlots;
    },
    enabled: !!doctorId && !!date,
  });
}
