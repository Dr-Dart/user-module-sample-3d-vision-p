import { ModuleContext } from "dart-api";
import React from 'react';
import { FormLabel, TextField, FormControl, Slider, FormControlLabel, InputAdornment, Divider } from "@mui/material";
import styles from "../assets/styles/styles.scss";
import store, {
    setSpeed,
} from '../reducers'
import { useSelector } from 'react-redux'
import { messages } from '../messages'

export default function JointSpeed(props: { moduleContext: ModuleContext }) {
    const { moduleContext } = props;
    const { packageName } = moduleContext;

    const Vel = useSelector(state => state.speed[0])
    const Acc = useSelector(state => state.speed[1])
    const state_ip = useSelector(state => state.state_ip)
    const state_tcp = useSelector(state => state.state_tcp)

    const onChangeSlider = (num: number) => (e: any) => {
        const tmp1 = document.getElementById("textfield_vel");
        const tmp2 = document.getElementById("textfield_acc");
        const tmp = [tmp1, tmp2]

        const newValue = store.getState().speed
        newValue[num] = parseInt(e.target.value) as number
        store.dispatch(setSpeed(newValue))

        if (tmp[num]) {
            tmp[num].value = String(parseInt(e.target.value))
        }
    }

    const onChangeTxtField = (num: number) => (e: any) => {
        const newSpeed = store.getState().speed
        newSpeed[num] = parseInt(e.target.value) as number
        if (isNaN(newSpeed[num])) {
            newSpeed[num] = 1
        }
        else if (newSpeed[num] > 100) {
            newSpeed[num] = 100
        }
        else if (newSpeed[num] < 1) {
            newSpeed[num] = 1
        }

        store.dispatch(setSpeed(newSpeed))
    }

    return (
        <FormControl disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} className={`${styles["option-contents"]} ${styles["joint-speed"]}`}>
            <div className={styles["form-label-wrapper"]}>
                <FormLabel>{messages.calibration_option_title_002}</FormLabel>
            </div>
            <div className={styles["slider-wrap"]}>
                <div className={styles["slider-option"]}>
                    <FormControlLabel label={messages.slider_title_001} labelPlacement={"top"}
                        control={<Slider value={Vel} marks={[
                            { value: 0, label: "0" },
                            { value: 100, label: "100" }]} defaultValue={Vel} onChange={onChangeSlider(0)} />}
                    />
                    <TextField id='textfield_vel' onChange={onChangeTxtField(0)} value={Vel} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]}
                        InputProps={{
                            type: "number",
                            endAdornment: <InputAdornment position={"end"}>%</InputAdornment>,
                        }} />
                </div>
                <Divider orientation={"vertical"} variant={"fullWidth"} />
                <div className={styles["slider-option"]}>
                    <FormControlLabel label={messages.slider_title_002} labelPlacement={"top"}
                        control={<Slider value={Acc} marks={[
                            { value: 0, label: "0" },
                            { value: 100, label: "100" }]} defaultValue={Acc} onChange={onChangeSlider(1)} />}
                    />
                    <TextField id='textfield_acc' onChange={onChangeTxtField(1)} value={Acc} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]}
                        InputProps={{
                            type: "number",
                            endAdornment: <InputAdornment position={"end"}>%</InputAdornment>,
                        }} />
                </div>
            </div>
        </FormControl>
    );
}