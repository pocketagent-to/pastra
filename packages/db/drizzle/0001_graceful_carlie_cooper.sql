CREATE INDEX "identities_user_idx" ON "identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "login_challenges_value_hash_idx" ON "login_challenges" USING btree ("value_hash");--> statement-breakpoint
CREATE INDEX "login_challenges_expires_idx" ON "login_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "metric_extras_connection_week_idx" ON "metric_extras" USING btree ("connection_id","week");--> statement-breakpoint
CREATE INDEX "metric_values_connection_week_idx" ON "metric_values" USING btree ("connection_id","week");--> statement-breakpoint
CREATE INDEX "sync_runs_connection_week_idx" ON "sync_runs" USING btree ("connection_id","week");--> statement-breakpoint
CREATE INDEX "friendships_user_b_idx" ON "friendships" USING btree ("user_b");--> statement-breakpoint
CREATE INDEX "invites_inviter_idx" ON "invites" USING btree ("inviter_id");--> statement-breakpoint
CREATE INDEX "stamps_user_idx" ON "stamps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "stamps_user_week_idx" ON "stamps" USING btree ("user_id","awarded_week");--> statement-breakpoint
CREATE INDEX "offer_codes_offer_assigned_idx" ON "offer_codes" USING btree ("offer_id","assigned_user_id");