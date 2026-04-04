# Common Workflows

This guide collects the most common end-user paths through the live platform.

## Scan A Prompt

1. Open [Haiku Scanner](modules/HAIKU_SCANNER.md).
2. Paste the prompt or model output you want to inspect.
3. Leave the relevant detection engines enabled.
4. Run the scan.
5. Review the verdict, findings, and severity breakdown.

## Scan A File Upload

1. Open [Haiku Scanner](modules/HAIKU_SCANNER.md).
2. Upload one or more supported files.
3. Add any companion text in the textarea.
4. Run the scan.
5. Treat results as extracted-text or metadata analysis, not full OCR or transcription.

## Browse And Compare Fixtures

1. Open [Armory](modules/ARMORY.md).
2. Stay in the `Fixtures` sub-tab.
3. Switch between `Tree`, `Search`, and `Grid` views as needed.
4. Enable `Compare` mode if you want side-by-side analysis.
5. Open fixture details or scan a fixture directly from the explorer.

## Send A Payload To The Scanner

1. Open [Armory](modules/ARMORY.md).
2. Switch to `Test Payloads`.
3. Choose a payload card.
4. Load it into the scanner.
5. Continue the analysis in [Haiku Scanner](modules/HAIKU_SCANNER.md).

## Add And Verify A Model

1. Open [Admin](modules/ADMIN.md).
2. Go to `API Keys`.
3. Add the provider-backed entry, credentials, and base URL if required.
4. Test the connection.
5. Open [LLM Dashboard](modules/LLM_DASHBOARD.md) and confirm the model appears in `Models`.

## Run A Single LLM Test

1. Open [LLM Dashboard](modules/LLM_DASHBOARD.md).
2. Confirm the model is enabled in `Models`.
3. Open `Tests`.
4. Select a model and one or more test cases.
5. Execute the test.
6. Review the output in `Results`.

## Run A Batch Of LLM Tests

1. Open [LLM Dashboard](modules/LLM_DASHBOARD.md).
2. Go to `Tests`.
3. Select multiple test cases and one or more models.
4. Start a batch.
5. Track the batch in `Results`, `Leaderboard`, `Compare`, or through the API.

## Run An Admin Validation Pass

1. Open [Admin](modules/ADMIN.md).
2. Go to `Validation`.
3. Leave all modules unchecked for a full validation pass, or choose one or more modules for a targeted run.
4. Turn on `Include Holdout Set` only when you want to evaluate the reserved holdout slice.
5. Select `Run Full Validation`.
6. Monitor the live progress card until the run completes.
7. Open the finished run from `Run History`.
8. Review `Module Results`, the `Non-Conformity Register`, and the `Traceability Chain`.
9. Export the report if you need to share evidence or archive the result.

## Turn On Guarded Execution

1. Open [Hattori Guard](modules/HATTORI_GUARD.md).
2. Enable the guard.
3. Choose the operating mode:
   - `Shinobi` for monitoring
   - `Samurai` for input blocking
   - `Sensei` for output blocking
   - `Hattori` for both directions
4. Set the block threshold to `WARNING+` or `CRITICAL only`.
5. Run LLM tests and review the audit log afterward.

## Review Framework Coverage

1. Open [Bushido Book](modules/BUSHIDO_BOOK.md).
2. Select a framework from the left rail.
3. Review `Overview`.
4. Move into `Coverage`, `Gap Matrix`, `Audit Trail`, or `Framework Compliance` as needed.
5. Use the built-in jump to LLM testing when you want to test against a selected framework.

## Run Adversarial Experiments

1. Open [Atemi Lab](modules/ATEMI_LAB.md).
2. Choose the attack mode.
3. Select the target model.
4. Explore `Attack Tools`, `Skills`, `MCP`, or `WebMCP`.
5. Use `Protocol Fuzz` only with the understanding that it is currently a placeholder.

## Review Strategic Signals

1. Open [The Kumite](modules/THE_KUMITE.md).
2. Start from the overview cards.
3. Enter one subsystem at a time:
   - `SAGE`
   - `Battle Arena`
   - `Mitsuke`
   - `Amaterasu DNA`
   - `Kagami`
   - `Shingan`
4. Use subsystem-specific guide and config drawers where available.

## Manage Bug Bounty Work

1. Open [Ronin Hub](modules/RONIN_HUB.md).
2. Browse `Programs` and subscribe to relevant targets.
3. Create or update entries in `Submissions`.
4. Treat `Planning` and `Intelligence` as future-facing placeholders for now.

## Launch A Sengoku Campaign

1. Open [Sengoku](modules/SENGOKU.md).
2. Click `New Campaign`.
3. Choose a **Target Source**:
   - **External URL** — enter the endpoint URL and select API Key or Bearer auth.
   - **LLM Dashboard** — pick a model already configured in the LLM Dashboard (credentials are resolved automatically).
   - **Local (Ollama)** — select from auto-detected local models or type a model name.
4. Select attack skills and set a schedule.
5. Create the campaign, then use `Run Now` to trigger execution.
6. Monitor progress in the run banner.
7. Use `Temporal` for time-oriented or session-sequenced testing.

## Score And Harden A Prompt

1. Open [Kotoba](modules/KOTOBA.md).
2. Paste the system or role prompt.
3. Optionally load an example prompt.
4. Run `Score Prompt`.
5. Review category scores and issue fixes.
6. Generate the hardened output.
