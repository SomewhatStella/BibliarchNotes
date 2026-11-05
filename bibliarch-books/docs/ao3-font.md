# AO3 reading font

Verified against the current official otwcode/otwarchive master source, commit
452391b648f2fb06b55c36133812449747634504.

## Evidence

- https://github.com/otwcode/otwarchive/blob/452391b648f2fb06b55c36133812449747634504/public/stylesheets/site/2.0/02-elements.css
  sets body to `font: 100%/1.125 'Lucida Grande', 'Lucida Sans Unicode', Verdana, Helvetica, sans-serif, 'GNU Unifont';`.
  The reset makes paragraph font-family inherit. Georgia belongs to
  `h1, h2, h3, h4, h5, h6, .heading`, not ordinary work prose.
- https://github.com/otwcode/otwarchive/blob/452391b648f2fb06b55c36133812449747634504/public/stylesheets/site/2.0/21-userstuff.css
  sets `.userstuff` line-height to 1.5 and word wrapping, without overriding
  its inherited family; `#workskin` changes size/layout, not family.
- https://github.com/otwcode/otwarchive/blob/452391b648f2fb06b55c36133812449747634504/public/stylesheets/site/2.0/01-core.css
  also defines the same body sans-serif stack.

All site/2.0 CSS font declarations were inspected to check for work-specific
family overrides. This verifies official source, not the exact revision deployed
on the live AO3 service. AO3 print media separately selects generic serif.

## Bibliarch implementation

The option is named **AO3 (Verdana fallback)**, mapping to existing CSS and saved
value `Verdana`. This is deliberately NOT labeled AO3 (Georgia). Verdana is an
explicit fallback in AO3's actual default work-reading stack; it is not claimed
to reproduce Lucida on devices where Lucida is installed. Existing Georgia,
Verdana, Arial, Times New Roman and custom-font values remain unchanged.

The shared display-label helper is used by the book body/title picker and text
selection dropdown. Dropdown values must remain actual families, not labels.
Print and EPUB therefore retain the already-supported Verdana family without
new allowlist entries, migration, font downloads or font embedding. No existing
book's appearance is changed automatically.

## Limits

AO3 site skins, author work skins, browser settings and device-installed fonts
can change the actual reading face. This option supplies a familiar supported
fallback, not an exact AO3 skin/theme clone or a guarantee of matching every
reader's AO3. Verdana availability is device-dependent; EPUB readers may override
typography. No proprietary font files are bundled or redistributed.

Tests: `npx vitest run tests/ao3-font.test.tsx` covers discoverability, real option
values, saved-value compatibility/rejection, and actual print/EPUB CSS output.
