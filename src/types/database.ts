
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "answer_options": {
                  Row: {
                    "created_at": string,"id": string,"label": string,"position": number,"question_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"label": string,"position": number,"question_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"label"?: string,"position"?: number,"question_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "answer_options_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"board_posts": {
                  Row: {
                    "author_dwelling": string,"body": string,"category": Database["public"]['Enums']["board_category"],"community_id": string,"created_at": string,"id": string,"member_id": string,"moderated_at": string | null,"moderated_by": string | null,"moderation_note": string | null,"status": Database["public"]['Enums']["board_post_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_dwelling": string,"body": string,"category"?: Database["public"]['Enums']["board_category"],"community_id": string,"created_at"?: string,"id"?: string,"member_id": string,"moderated_at"?: string | null,"moderated_by"?: string | null,"moderation_note"?: string | null,"status"?: Database["public"]['Enums']["board_post_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "author_dwelling"?: string,"body"?: string,"category"?: Database["public"]['Enums']["board_category"],"community_id"?: string,"created_at"?: string,"id"?: string,"member_id"?: string,"moderated_at"?: string | null,"moderated_by"?: string | null,"moderation_note"?: string | null,"status"?: Database["public"]['Enums']["board_post_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "board_posts_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "board_posts_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "community_members"
      referencedColumns: ["id"]
    }
                  ]
                },"common_spaces": {
                  Row: {
                    "booking_window_days": number,"cancel_notice_hours": number,"community_id": string,"created_at": string,"description": string | null,"id": string,"is_active": boolean,"max_future_per_member": number,"name": string,"rules": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_window_days"?: number,"cancel_notice_hours"?: number,"community_id": string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"max_future_per_member"?: number,"name": string,"rules"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "booking_window_days"?: number,"cancel_notice_hours"?: number,"community_id"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"max_future_per_member"?: number,"name"?: string,"rules"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "common_spaces_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    }
                  ]
                },"communities": {
                  Row: {
                    "address": string | null,"created_at": string,"id": string,"logo_url": string | null,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"created_at"?: string,"id"?: string,"logo_url"?: string | null,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"created_at"?: string,"id"?: string,"logo_url"?: string | null,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"community_admins": {
                  Row: {
                    "community_id": string,"created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "community_id": string,"created_at"?: string,"user_id": string
                  }
                  Update: {
                    "community_id"?: string,"created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_admins_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    }
                  ]
                },"community_documents": {
                  Row: {
                    "amount_cents": number | null,"community_id": string,"created_at": string,"created_by": string | null,"document_date": string,"file_name": string,"file_path": string,"id": string,"kind": Database["public"]['Enums']["document_kind"],"supplier": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents"?: number | null,"community_id": string,"created_at"?: string,"created_by"?: string | null,"document_date": string,"file_name": string,"file_path": string,"id"?: string,"kind"?: Database["public"]['Enums']["document_kind"],"supplier"?: string | null,"title": string
                  }
                  Update: {
                    "amount_cents"?: number | null,"community_id"?: string,"created_at"?: string,"created_by"?: string | null,"document_date"?: string,"file_name"?: string,"file_path"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["document_kind"],"supplier"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_documents_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    }
                  ]
                },"community_members": {
                  Row: {
                    "community_id": string,"created_at": string,"dwelling_key": string | null,"dwelling_label": string,"full_name": string,"id": string,"is_active": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "community_id": string,"created_at"?: string,"dwelling_key"?: never,"dwelling_label": string,"full_name": string,"id"?: string,"is_active"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "community_id"?: string,"created_at"?: string,"dwelling_key"?: never,"dwelling_label"?: string,"full_name"?: string,"id"?: string,"is_active"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_members_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    }
                  ]
                },"incident_updates": {
                  Row: {
                    "author_label": string,"created_at": string,"created_by": string | null,"id": number,"incident_id": string,"message": string | null,"responsible_name": string | null,"responsible_type": Database["public"]['Enums']["incident_responsible"] | null,"status": Database["public"]['Enums']["incident_status"] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "author_label": string,"created_at"?: string,"created_by"?: string | null,"id"?: never,"incident_id": string,"message"?: string | null,"responsible_name"?: string | null,"responsible_type"?: Database["public"]['Enums']["incident_responsible"] | null,"status"?: Database["public"]['Enums']["incident_status"] | null
                  }
                  Update: {
                    "author_label"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: never,"incident_id"?: string,"message"?: string | null,"responsible_name"?: string | null,"responsible_type"?: Database["public"]['Enums']["incident_responsible"] | null,"status"?: Database["public"]['Enums']["incident_status"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "incident_updates_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents"
      referencedColumns: ["id"]
    }
                  ]
                },"incidents": {
                  Row: {
                    "category": Database["public"]['Enums']["incident_category"],"community_id": string,"created_at": string,"created_by": string | null,"description": string,"estimated_resolution": string | null,"id": string,"location": string | null,"photo_path": string | null,"reported_by_member": string | null,"reported_dwelling": string | null,"resolved_at": string | null,"responsible_name": string | null,"responsible_type": Database["public"]['Enums']["incident_responsible"] | null,"status": Database["public"]['Enums']["incident_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: Database["public"]['Enums']["incident_category"],"community_id": string,"created_at"?: string,"created_by"?: string | null,"description"?: string,"estimated_resolution"?: string | null,"id"?: string,"location"?: string | null,"photo_path"?: string | null,"reported_by_member"?: string | null,"reported_dwelling"?: string | null,"resolved_at"?: string | null,"responsible_name"?: string | null,"responsible_type"?: Database["public"]['Enums']["incident_responsible"] | null,"status"?: Database["public"]['Enums']["incident_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["incident_category"],"community_id"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string,"estimated_resolution"?: string | null,"id"?: string,"location"?: string | null,"photo_path"?: string | null,"reported_by_member"?: string | null,"reported_dwelling"?: string | null,"resolved_at"?: string | null,"responsible_name"?: string | null,"responsible_type"?: Database["public"]['Enums']["incident_responsible"] | null,"status"?: Database["public"]['Enums']["incident_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "incidents_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_reported_by_member_fkey"
      columns: ["reported_by_member"]
isOneToOne: false
      referencedRelation: "community_members"
      referencedColumns: ["id"]
    }
                  ]
                },"login_attempts": {
                  Row: {
                    "failed_count": number,"locked_until": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "failed_count"?: number,"locked_until"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "failed_count"?: number,"locked_until"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"meetings": {
                  Row: {
                    "community_id": string,"created_at": string,"created_by": string | null,"description": string | null,"finished_at": string | null,"id": string,"meeting_date": string,"minutes_content": string | null,"minutes_file_name": string | null,"minutes_file_path": string | null,"started_at": string | null,"status": Database["public"]['Enums']["meeting_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "community_id": string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"finished_at"?: string | null,"id"?: string,"meeting_date": string,"minutes_content"?: string | null,"minutes_file_name"?: string | null,"minutes_file_path"?: string | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["meeting_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "community_id"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"finished_at"?: string | null,"id"?: string,"meeting_date"?: string,"minutes_content"?: string | null,"minutes_file_name"?: string | null,"minutes_file_path"?: string | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["meeting_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meetings_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    }
                  ]
                },"member_credentials": {
                  Row: {
                    "failed_attempts": number,"locked_until": string | null,"member_id": string,"password_hash": string | null,"password_set_at": string | null,"pin_hash": string,"pin_lookup": string | null,"pin_updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "failed_attempts"?: number,"locked_until"?: string | null,"member_id": string,"password_hash"?: string | null,"password_set_at"?: string | null,"pin_hash": string,"pin_lookup"?: string | null,"pin_updated_at"?: string
                  }
                  Update: {
                    "failed_attempts"?: number,"locked_until"?: string | null,"member_id"?: string,"password_hash"?: string | null,"password_set_at"?: string | null,"pin_hash"?: string,"pin_lookup"?: string | null,"pin_updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "member_credentials_member_id_fkey"
      columns: ["member_id"]
isOneToOne: true
      referencedRelation: "community_members"
      referencedColumns: ["id"]
    }
                  ]
                },"member_private": {
                  Row: {
                    "dni": string,"member_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "dni": string,"member_id": string,"updated_at"?: string
                  }
                  Update: {
                    "dni"?: string,"member_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "member_private_member_id_fkey"
      columns: ["member_id"]
isOneToOne: true
      referencedRelation: "community_members"
      referencedColumns: ["id"]
    }
                  ]
                },"member_sessions": {
                  Row: {
                    "access_scope": string,"created_at": string,"member_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_scope"?: string,"created_at"?: string,"member_id": string,"user_id": string
                  }
                  Update: {
                    "access_scope"?: string,"created_at"?: string,"member_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "member_sessions_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "community_members"
      referencedColumns: ["id"]
    }
                  ]
                },"notice_reads": {
                  Row: {
                    "member_id": string,"notice_id": string,"read_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "member_id": string,"notice_id": string,"read_at"?: string
                  }
                  Update: {
                    "member_id"?: string,"notice_id"?: string,"read_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notice_reads_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "community_members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notice_reads_notice_id_fkey"
      columns: ["notice_id"]
isOneToOne: false
      referencedRelation: "notices"
      referencedColumns: ["id"]
    }
                  ]
                },"notices": {
                  Row: {
                    "attachment_name": string | null,"attachment_path": string | null,"body": string,"category": Database["public"]['Enums']["notice_category"],"community_id": string,"created_at": string,"created_by": string | null,"expires_at": string | null,"id": string,"is_pinned": boolean,"is_urgent": boolean,"published_at": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attachment_name"?: string | null,"attachment_path"?: string | null,"body": string,"category"?: Database["public"]['Enums']["notice_category"],"community_id": string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string | null,"id"?: string,"is_pinned"?: boolean,"is_urgent"?: boolean,"published_at"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "attachment_name"?: string | null,"attachment_path"?: string | null,"body"?: string,"category"?: Database["public"]['Enums']["notice_category"],"community_id"?: string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string | null,"id"?: string,"is_pinned"?: boolean,"is_urgent"?: boolean,"published_at"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notices_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"question_status_log": {
                  Row: {
                    "changed_at": string,"changed_by": string | null,"from_status": Database["public"]['Enums']["question_status"],"id": number,"question_id": string,"to_status": Database["public"]['Enums']["question_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_at"?: string,"changed_by"?: string | null,"from_status": Database["public"]['Enums']["question_status"],"id"?: never,"question_id": string,"to_status": Database["public"]['Enums']["question_status"]
                  }
                  Update: {
                    "changed_at"?: string,"changed_by"?: string | null,"from_status"?: Database["public"]['Enums']["question_status"],"id"?: never,"question_id"?: string,"to_status"?: Database["public"]['Enums']["question_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "question_status_log_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"questions": {
                  Row: {
                    "closed_at": string | null,"created_at": string,"description": string | null,"id": string,"meeting_id": string,"opened_at": string | null,"position": number,"reopen_count": number,"response_type": Database["public"]['Enums']["response_type"],"status": Database["public"]['Enums']["question_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"meeting_id": string,"opened_at"?: string | null,"position": number,"reopen_count"?: number,"response_type"?: Database["public"]['Enums']["response_type"],"status"?: Database["public"]['Enums']["question_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "closed_at"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"meeting_id"?: string,"opened_at"?: string | null,"position"?: number,"reopen_count"?: number,"response_type"?: Database["public"]['Enums']["response_type"],"status"?: Database["public"]['Enums']["question_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "questions_meeting_id_fkey"
      columns: ["meeting_id"]
isOneToOne: false
      referencedRelation: "meetings"
      referencedColumns: ["id"]
    }
                  ]
                },"receipts": {
                  Row: {
                    "amount_cents": number,"community_id": string,"concept": string,"created_at": string,"due_date": string,"file_name": string | null,"file_path": string | null,"id": string,"member_id": string,"paid_at": string | null,"period_start": string,"status": Database["public"]['Enums']["receipt_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"community_id": string,"concept": string,"created_at"?: string,"due_date": string,"file_name"?: string | null,"file_path"?: string | null,"id"?: string,"member_id": string,"paid_at"?: string | null,"period_start": string,"status"?: Database["public"]['Enums']["receipt_status"],"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"community_id"?: string,"concept"?: string,"created_at"?: string,"due_date"?: string,"file_name"?: string | null,"file_path"?: string | null,"id"?: string,"member_id"?: string,"paid_at"?: string | null,"period_start"?: string,"status"?: Database["public"]['Enums']["receipt_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "receipts_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "receipts_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "community_members"
      referencedColumns: ["id"]
    }
                  ]
                },"reservations": {
                  Row: {
                    "cancel_reason": string | null,"cancelled_at": string | null,"cancelled_by": string | null,"community_id": string,"created_at": string,"ends_at": string,"id": string,"member_id": string,"slot_id": string | null,"slot_label": string,"space_id": string,"starts_at": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"community_id": string,"created_at"?: string,"ends_at": string,"id"?: string,"member_id": string,"slot_id"?: string | null,"slot_label": string,"space_id": string,"starts_at": string,"status"?: string
                  }
                  Update: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"community_id"?: string,"created_at"?: string,"ends_at"?: string,"id"?: string,"member_id"?: string,"slot_id"?: string | null,"slot_label"?: string,"space_id"?: string,"starts_at"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reservations_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reservations_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "community_members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reservations_slot_id_fkey"
      columns: ["slot_id"]
isOneToOne: false
      referencedRelation: "space_slots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reservations_space_id_fkey"
      columns: ["space_id"]
isOneToOne: false
      referencedRelation: "common_spaces"
      referencedColumns: ["id"]
    }
                  ]
                },"space_slots": {
                  Row: {
                    "end_time": string,"id": string,"is_active": boolean,"label": string,"position": number,"space_id": string,"start_time": string,"weekdays": (number)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "end_time": string,"id"?: string,"is_active"?: boolean,"label": string,"position"?: number,"space_id": string,"start_time": string,"weekdays"?: (number)[]
                  }
                  Update: {
                    "end_time"?: string,"id"?: string,"is_active"?: boolean,"label"?: string,"position"?: number,"space_id"?: string,"start_time"?: string,"weekdays"?: (number)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "space_slots_space_id_fkey"
      columns: ["space_id"]
isOneToOne: false
      referencedRelation: "common_spaces"
      referencedColumns: ["id"]
    }
                  ]
                },"votes": {
                  Row: {
                    "created_at": string,"id": string,"member_id": string,"option_id": string,"question_id": string,"recorded_by": string | null,"recorded_by_name": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"member_id": string,"option_id": string,"question_id": string,"recorded_by"?: string | null,"recorded_by_name"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"member_id"?: string,"option_id"?: string,"question_id"?: string,"recorded_by"?: string | null,"recorded_by_name"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "votes_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "community_members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "votes_option_belongs_to_question"
      columns: ["question_id","option_id"]
isOneToOne: false
      referencedRelation: "answer_options"
      referencedColumns: ["question_id","id"]
    },{
      foreignKeyName: "votes_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                }
                ,"admin_vote_audit": {
                  Row: {
                    "changed_at": string,"changed_by": string | null,"changed_by_name": string,"id": number,"member_id": string,"option_label": string,"question_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_at"?: string,"changed_by"?: string | null,"changed_by_name": string,"id"?: never,"member_id": string,"option_label": string,"question_id": string
                  }
                  Update: {
                    "changed_at"?: string,"changed_by"?: string | null,"changed_by_name"?: string,"id"?: never,"member_id"?: string,"option_label"?: string,"question_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "admin_vote_audit_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "community_members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "admin_vote_audit_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_cancel_reservation":
{ Args: { "p_reason": string,"p_reservation_id": string }; Returns: undefined
                           },
"admin_create_incident":
{ Args: { "p_category": Database["public"]['Enums']["incident_category"],"p_community_id": string,"p_description": string,"p_location": string,"p_photo_path"?: string,"p_title": string }; Returns: string
                           },
"admin_create_member":
{ Args: { "p_community_id": string,"p_dni": string,"p_dwelling_label": string,"p_full_name": string }; Returns: Json
                           },
"admin_dashboard":
{ Args: { "p_community_id": string }; Returns: Json
                           },
"admin_delete_question":
{ Args: { "p_question_id": string }; Returns: undefined
                           },
"admin_finance_summary":
{ Args: { "p_community_id": string }; Returns: Json
                           },
"admin_issue_receipts":
{ Args: { "p_amount_cents": number,"p_community_id": string,"p_concept": string,"p_due_date": string,"p_period_start": string }; Returns: number
                           },
"admin_meeting_votes":
{ Args: { "p_meeting_id": string }; Returns: {
              "dwelling_label": string,"full_name": string,"manual_history": Json,"member_id": string,"option_label": string,"question_id": string,"question_position": number,"question_title": string,"recorded_by_name": string | null,"updated_at": string,"voted_at": string
            }[]
                           },
"admin_record_vote":
{ Args: { "p_member_id": string,"p_option_id": string,"p_question_id": string }; Returns: undefined
                           },
"admin_member_access_status":
{ Args: { "p_community_id": string }; Returns: {
              "has_password": boolean,"locked_until": string,"member_id": string,"password_set_at": string
            }[]
                           },
"admin_moderate_board_post":
{ Args: { "p_decision": Database["public"]['Enums']["board_post_status"],"p_note": string,"p_post_id": string }; Returns: undefined
                           },
"admin_reorder_questions":
{ Args: { "p_meeting_id": string,"p_question_ids": (string)[] }; Returns: undefined
                           },
"admin_reset_member_pin":
{ Args: { "p_member_id": string }; Returns: string
                           },
"admin_save_question":
{ Args: { "p_description": string,"p_meeting_id": string,"p_options": (string)[],"p_question_id"?: string,"p_title": string }; Returns: string
                           },
"admin_save_space":
{ Args: { "p_cancel_hours": number,"p_community_id": string,"p_description": string,"p_is_active": boolean,"p_max_future": number,"p_name": string,"p_rules": string,"p_slots": Json,"p_space_id": string,"p_window_days": number }; Returns: string
                           },
"admin_update_incident":
{ Args: { "p_estimated_resolution": string,"p_incident_id": string,"p_message": string,"p_responsible_name": string,"p_responsible_type": Database["public"]['Enums']["incident_responsible"],"p_status": Database["public"]['Enums']["incident_status"] }; Returns: undefined
                           },
"admin_update_member":
{ Args: { "p_dni": string,"p_dwelling_label": string,"p_full_name": string,"p_is_active": boolean,"p_member_id": string }; Returns: undefined
                           },
"cast_vote":
{ Args: { "p_option_id": string,"p_question_id": string }; Returns: Json
                           },
"close_open_questions":
{ Args: { "p_meeting_id": string }; Returns: number
                           },
"close_question":
{ Args: { "p_question_id": string }; Returns: undefined
                           },
"finish_meeting":
{ Args: { "p_meeting_id": string }; Returns: number
                           },
"get_meeting_results":
{ Args: { "p_meeting_id": string }; Returns: {
              "eligible_members": number,"option_id": string,"option_label": string,"option_position": number,"percentage": number,"question_closed_at": string,"question_id": string,"question_opened_at": string,"question_position": number,"question_status": Database["public"]['Enums']["question_status"],"question_title": string,"total_votes": number,"vote_count": number
            }[]
                           },
"get_my_membership":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_space_availability":
{ Args: { "p_days"?: number,"p_from": string,"p_space_id": string }; Returns: {
              "day": string,"ends_at": string,"my_reservation_id": string,"slot_id": string,"slot_label": string,"starts_at": string,"state": string
            }[]
                           },
"mark_notice_read":
{ Args: { "p_notice_id": string }; Returns: undefined
                           },
"member_activate":
{ Args: { "p_dni": string,"p_password": string,"p_pin": string }; Returns: Json
                           },
"member_book_slot":
{ Args: { "p_day": string,"p_slot_id": string }; Returns: string
                           },
"member_cancel_reservation":
{ Args: { "p_reservation_id": string }; Returns: undefined
                           },
"member_change_password":
{ Args: { "p_current": string,"p_new": string }; Returns: undefined
                           },
"member_create_board_post":
{ Args: { "p_body": string,"p_category": Database["public"]['Enums']["board_category"],"p_title": string }; Returns: string
                           },
"member_password_sign_in":
{ Args: { "p_dni": string,"p_password": string }; Returns: Json
                           },
"member_report_incident":
{ Args: { "p_category": Database["public"]['Enums']["incident_category"],"p_description": string,"p_location": string,"p_photo_path"?: string,"p_title": string }; Returns: string
                           },
"member_sign_in":
{ Args: { "p_dni": string,"p_dwelling": string,"p_full_name": string,"p_pin": string }; Returns: Json
                           },
"member_sign_out":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"member_withdraw_board_post":
{ Args: { "p_post_id": string }; Returns: undefined
                           },
"open_eligible_questions":
{ Args: { "p_meeting_id": string }; Returns: number
                           },
"open_question":
{ Args: { "p_question_id": string }; Returns: undefined
                           },
"reopen_question":
{ Args: { "p_question_id": string }; Returns: undefined
                           },
"start_meeting":
{ Args: { "p_meeting_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "board_category": "announcement"|"lost_found"|"buy_sell"|"recommendation"|"other","board_post_status": "pending"|"approved"|"rejected"|"withdrawn","document_kind": "invoice"|"budget"|"accounts"|"contract"|"insurance"|"other","incident_category": "electricity"|"plumbing"|"elevator"|"cleaning"|"gardening"|"security"|"structure"|"other","incident_responsible": "administration"|"developer"|"company"|"insurance","incident_status": "reported"|"in_review"|"in_progress"|"resolved"|"dismissed","meeting_status": "draft"|"in_progress"|"finished","notice_category": "general"|"works"|"maintenance"|"meeting"|"security"|"cleaning"|"other","question_status": "draft"|"open"|"closed","receipt_status": "pending"|"paid"|"returned","response_type": "single_choice"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "board_category": ["announcement", "lost_found", "buy_sell", "recommendation", "other"],"board_post_status": ["pending", "approved", "rejected", "withdrawn"],"document_kind": ["invoice", "budget", "accounts", "contract", "insurance", "other"],"incident_category": ["electricity", "plumbing", "elevator", "cleaning", "gardening", "security", "structure", "other"],"incident_responsible": ["administration", "developer", "company", "insurance"],"incident_status": ["reported", "in_review", "in_progress", "resolved", "dismissed"],"meeting_status": ["draft", "in_progress", "finished"],"notice_category": ["general", "works", "maintenance", "meeting", "security", "cleaning", "other"],"question_status": ["draft", "open", "closed"],"receipt_status": ["pending", "paid", "returned"],"response_type": ["single_choice"]
          }
        }
} as const
