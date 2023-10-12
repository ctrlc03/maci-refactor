import { createCommand } from "commander"
import {
    genKeyPair
} from "./commands/genKeyPair"
import { readFileSync } from "fs"
import { dirname } from "path"
import { fileURLToPath } from "url"
import { genMaciPubKey } from "./commands/genPubKey"

const packagePath = `${dirname(fileURLToPath(import.meta.url))}/..`
const { description, version, name } = JSON.parse(
    readFileSync(`${packagePath}/package.json`, "utf8")
)
const program = createCommand()
program.name(name).description(description).version(version)

program
    .command("deploy")
    .description("deploy the contracts").action(() => {})
program
    .command("genMaciPubKey")
    .description("generate a new MACI public key")
    .requiredOption("-sk, --privkey <privkey>", "the private key")
    .action(genMaciPubKey)
program.command("genMaciKeyPair").description("generate a new MACI key pair").action(genKeyPair)
program.command("deployPoll").description("deploy a new poll").action(() => {})

program.parseAsync(process.argv)