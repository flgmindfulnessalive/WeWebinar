-- WeWebinars Launchpad Fase 3: guía de implementación. A diferencia de
-- Blueprint (18 filas, una por slide), acá no hace falta una tabla nueva:
-- el checklist es estático (6 items fijos, ver
-- src/lib/launchpad/implementation-content.ts) y lo único que el usuario
-- produce es qué items marcó -- eso ya cabe en el
-- launchpad_step_progress.metadata jsonb que existe desde la Fase 1
-- ({"checkedItems": ["video", "schedule", ...]}).
alter type public.launchpad_event_type add value 'implementation_item_checked';
alter type public.launchpad_event_type add value 'implementation_completed';
