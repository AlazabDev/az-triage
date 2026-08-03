-- Validate and normalize anonymous visitor comments
CREATE OR REPLACE FUNCTION public.validate_image_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.visitor_name := btrim(NEW.visitor_name);
  NEW.text := btrim(NEW.text);

  IF NEW.visitor_name IS NULL OR length(NEW.visitor_name) < 2 OR length(NEW.visitor_name) > 60 THEN
    RAISE EXCEPTION 'invalid visitor_name';
  END IF;

  IF NEW.text IS NULL OR length(NEW.text) < 1 OR length(NEW.text) > 2000 THEN
    RAISE EXCEPTION 'invalid comment text';
  END IF;

  IF NEW.visitor_phone IS NOT NULL THEN
    NEW.visitor_phone := btrim(NEW.visitor_phone);
    IF NEW.visitor_phone = '' THEN
      NEW.visitor_phone := NULL;
    ELSIF NEW.visitor_phone !~ '^[0-9+][0-9 +()-]{5,24}$' THEN
      RAISE EXCEPTION 'invalid visitor_phone';
    END IF;
  END IF;

  IF NEW.session_id IS NOT NULL AND length(NEW.session_id) > 100 THEN
    RAISE EXCEPTION 'invalid session_id';
  END IF;

  -- visitors never control moderation state
  NEW.status := 'open';
  NEW.created_at := now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_image_comment ON public.image_comments;
CREATE TRIGGER trg_validate_image_comment
BEFORE INSERT ON public.image_comments
FOR EACH ROW EXECUTE FUNCTION public.validate_image_comment();

-- Tighten insert policy: image must belong to the same public project, moderation state fixed
DROP POLICY IF EXISTS "Anyone can post comments on public projects" ON public.image_comments;
CREATE POLICY "Visitors can post validated comments on public projects"
ON public.image_comments
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'open'
  AND length(btrim(visitor_name)) BETWEEN 2 AND 60
  AND length(btrim(text)) BETWEEN 1 AND 2000
  AND EXISTS (
    SELECT 1
    FROM public.project_images pi
    JOIN public.projects p ON p.id = pi.project_id
    WHERE pi.id = image_comments.image_id
      AND pi.project_id = image_comments.project_id
      AND p.is_public = true
  )
);