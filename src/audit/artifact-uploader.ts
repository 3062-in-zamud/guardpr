import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { DefaultArtifactClient } from "@actions/artifact";

import { AuditLogEntry } from "../types";
import { info } from "../utils/logger";

export class ArtifactUploader {
  async upload(log: AuditLogEntry, runId: number): Promise<string> {
    const artifactName = `guardpr-audit-${runId}`;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "guardpr-audit-"));
    const filePath = path.join(tmpDir, `${artifactName}.json`);

    fs.writeFileSync(filePath, JSON.stringify(log, null, 2));

    const client = new DefaultArtifactClient();
    await client.uploadArtifact(artifactName, [filePath], tmpDir, {
      retentionDays: 30,
    });

    info(`Uploaded audit artifact: ${artifactName}`);

    // Cleanup temp file
    try {
      fs.unlinkSync(filePath);
      fs.rmdirSync(tmpDir);
    } catch {
      // Best effort cleanup
    }

    return artifactName;
  }
}
