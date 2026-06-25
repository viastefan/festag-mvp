-- Extension writing assistant — explain + translate actions.

alter table extension_writing_events
  drop constraint if exists extension_writing_events_action_check;

alter table extension_writing_events
  add constraint extension_writing_events_action_check
  check (action in ('clearer', 'professional', 'shorter', 'feedback', 'casual', 'explain', 'translate'));
