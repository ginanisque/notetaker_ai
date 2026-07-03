grant usage on schema public to service_role;

grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.workspaces to service_role;
grant select, insert, update, delete on public.workspace_members to service_role;
grant select, insert, update, delete on public.workspace_invites to service_role;
grant select, insert, update, delete on public.meetings to service_role;
grant select, insert, update, delete on public.action_items to service_role;
grant select, insert, update, delete on public.comments to service_role;
grant select, insert, update, delete on public.meeting_tags to service_role;
grant select, insert, update, delete on public.meeting_tag_links to service_role;
grant select, insert, update, delete on public.meeting_sessions to service_role;

grant execute on function public.is_workspace_member(uuid) to service_role;
grant execute on function public.is_workspace_admin(uuid) to service_role;
grant execute on function public.can_access_meeting(uuid) to service_role;
grant execute on function public.is_workspace_owner(uuid) to service_role;
