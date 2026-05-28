-- Project target date — surfaced + editable in the project view Properties.
alter table projects add column if not exists target_date date;
