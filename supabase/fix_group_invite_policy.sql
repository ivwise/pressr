-- Fix group_members policy to allow users to accept invites

DROP POLICY IF EXISTS "Group creators can add members" ON public.group_members;

-- New policy: Group creators can add members OR users can add themselves
CREATE POLICY "Group creators and invited users can add members"
  ON public.group_members FOR INSERT
  WITH CHECK (
    -- Group creator can add anyone
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = group_id AND created_by = auth.uid()
    )
    OR
    -- Users can add themselves (for accepting invites)
    auth.uid() = user_id
  );
