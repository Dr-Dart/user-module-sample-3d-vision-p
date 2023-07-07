import {
    Context,
    ModuleService,
    IModuleChannel,
    IProgramManager,
    ProgramSaveMode,
    Message,
} from 'dart-api';

import { DRL_PhotoneoCommon, DRL_StateServer } from './drl/drl';
import { IDartDatabase, logger } from 'dart-api';
const TABLE_PHOTONEO_NAME = 'photoneo';
const TABLE_PHOTONEO_COLUMNS = ['data', 'drl_inputs', 'drl_userdefine', 'drl_main'];

export default class ServiceForTaskEditor extends ModuleService {
    private db: IDartDatabase | null;

    constructor(props: any) {
        super(props);
        this.db = this.moduleContext.getSystemLibrary(Context.DART_DATABASE) as IDartDatabase;
    }

    onBind(message: Message, channel: IModuleChannel): boolean {
        const programManager = this.moduleContext.getSystemManager(Context.PROGRAM_MANAGER) as IProgramManager;
        logger.debug(`User command onBind: ${this.moduleContext.componentId}, ${JSON.stringify(message)}`);
        channel.receive("req_to_save_commands_def_as_sub_program", ({ componentId, programName }) => {
            let program = `from DRCF import * \r\n`
            if (componentId == "pip_photoneo_drl") {
                this.db?.query(TABLE_PHOTONEO_NAME, TABLE_PHOTONEO_COLUMNS, {}).then((queryResult) => {
                    const tmp = JSON.parse(queryResult[0].data.drl_inputs)
                    var DRL_input_var =
                        `
vel = ${JSON.stringify(parseInt(tmp.vel)) + '\r'}
acc = ${JSON.stringify(parseInt(tmp.acc)) + '\r'}
STATE_SRV_PORT = ${JSON.stringify(parseInt(tmp.STATE_SRV_PORT)) + '\r'}
BINPICKING_SRV_PORT = ${JSON.stringify(parseInt(tmp.BINPICKING_SRV_PORT)) + '\r'}
BINPICKING_SRV_IP = ${JSON.stringify(tmp.BINPICKING_SRV_IP) + '\r'}
home_pose = posj(${tmp.homepose})
start_pose = posj(${tmp.startpose})
end_pose = posj(${tmp.endpose})
vision_system_id = ${JSON.stringify(parseInt(tmp.vsid))}
`

                    program = program + DRL_input_var + DRL_PhotoneoCommon + queryResult[0].data.drl_userdefine + DRL_StateServer + queryResult[0].data.drl_main
                    programManager.saveSubProgram(ProgramSaveMode.SAVE, programName, program)
                        .then(result => {
                            channel.send("req_to_save_commands_def_as_sub_program", result);
                        });
                });
            }
        });

        channel.receive("gen_command_call", ({ componentId, data }) => {
            let result = ``;
            if (componentId == "pip_photoneo_drl") {
                result = `main_binpicking_example_basic()`
            }
            channel.send("gen_command_call", result);

        });
        return true;
    }

    onUnbind(message: Message) {
        logger.debug(`Service onUnbind: ${this.moduleContext.componentId}, ${JSON.stringify(message)}`);
    }
}