export const DRL_port_test = `
# StateServer module v.1.6
# Copyright(c) 2022 Photoneo s.r.o.
# All rights reserved

# -----------------------------------------------------------------------------
# --------------------------- PHOTONEO STATE SERVER ---------------------------
# -----------------------------------------------------------------------------

import struct

# Default port of state server
#STATE_SRV_PORT = 11004


JOINT_STATE_MSG_ID = 1
TOOL_POSE_MSG_ID = 2

# This determines byteorder for sending data and representing received data.
# Native robot controller endianness is 'little' (tested using sys.byteorder)
ENDIANNESS = 'little'
BYTEORDER_FMT = {'little': '<', 'big': '>'}[ENDIANNESS]

JOINTS_STATE_FMT = '6f'
JOINTS_STATE_BYTES = struct.calcsize(JOINTS_STATE_FMT)

TOOL0_POSE_FMT = '6f'
TOOL0_POSE_BYTES = struct.calcsize(TOOL0_POSE_FMT)

stsrv_socket = None

PHO_DEBUG_STSRV = False
# Robot brand
BRAND_ID = 'DOOSAN/1.6.0_XXXXXXXXXXX'

def get_header(payload_size, request_id):
    data = struct.pack(BYTEORDER_FMT + '5i', ord('P'), ord('H'), ord('O'), payload_size, request_id)
    return data
def stsrv_handle_socket_write_error(status, log=True, message1='', message2=''):
    global PHO_DEBUG_STSRV

    if status == -1:
        if log or PHO_DEBUG_STSRV:
            tp_log(message1 + ' The client is not connected (-1). ' + message2)
    elif status == -2:
        if log or PHO_DEBUG_STSRV:
            tp_log(message1 + ' Server/Client is disconnected, or socket.error occurred during a data transfer (-2). '
                   + message2)
    else:
        if log or PHO_DEBUG_STSRV:
            tp_log(message1 + ' Unknown error during socket write ({}) '.format(status) + message2)


def get_tool0_pose():
    """
    Returns the current tool0
    position in robot (base) space in [mm]
    and orientation as Euler angles ZYZ [degrees]
    """
    return get_current_tool_flange_posx(DR_BASE)


def get_tool0_pose_as_bytes():
    global TOOL0_POSE_FMT, BYTEORDER_FMT
    pose = get_tool0_pose()
    data = struct.pack(BYTEORDER_FMT + TOOL0_POSE_FMT, *pose)
    return data


def get_joints_state_as_bytes():
    """
    Gets current joint states in degrees
    and converts the 6 floats (j1, ..j6) to bytes
    """
    global JOINTS_STATE_FMT, BYTEORDER_FMT
    joints_deg = get_current_posj()
    return struct.pack(BYTEORDER_FMT + JOINTS_STATE_FMT, *joints_deg)


def stsrv_open_socket():
    global STATE_SRV_PORT, stsrv_socket
    stsrv_socket = server_socket_open(STATE_SRV_PORT)


def stsrv_send_joints_state():
    global stsrv_socket, JOINT_STATE_MSG_ID
    data = get_header(payload_size=6, request_id=JOINT_STATE_MSG_ID)
    data += get_joints_state_as_bytes()
    return data


def stsrv_send_tcp_state():
    global stsrv_socket, TOOL_POSE_MSG_ID
    data = get_header(payload_size=6, request_id=TOOL_POSE_MSG_ID)
    data += get_tool0_pose_as_bytes()
    return data


def stsrv_check_version():
    global stsrv_socket, BRAND_ID

    data = struct.pack('24s', BRAND_ID.encode(encoding='UTF-8'))
    status = server_socket_write(stsrv_socket, data)

    if status != 0:
        stsrv_handle_socket_write_error(status, True, 'Unable to send the Robot ID to the Vision Controller', '')
        return False

    return True


def run_state_server():
    global stsrv_socket, PHO_DEBUG_STSRV

    tp_log('State server: waiting for a new connection')
    stsrv_open_socket()

    if stsrv_check_version():
        status = 0
        while status == 0:
            data = stsrv_send_joints_state()
            status_joint = server_socket_write(stsrv_socket, data)
            if status_joint != 0:
                stsrv_handle_socket_write_error(status_joint, True, 'An error occurred while sending joint status')

            data = stsrv_send_tcp_state()
            status_tcp = server_socket_write(stsrv_socket, data)
            if status_tcp != 0:
                stsrv_handle_socket_write_error(status_tcp, True, 'An error occurred while sending tcp status')

            status = status_joint + status_tcp
            wait(0.1)

        stsrv_handle_socket_write_error(status, True, 'State server:', '')
        wait(1.0)  # Wait after failure

    server_socket_close(stsrv_socket)
    tp_log('State server: Vision Controller has disconnected')


def pho_start_state_server():
    """
    Starts the State server in a separate thread
    """
    return thread_run(run_state_server, loop=True)



# PhotoneoCommon module v.1.6
# Copyright(c) 2022 Photoneo s.r.o.
# All rights reserved

# ===== GLOBAL CONSTANTS
PHO_DEBUG = False

# Port for binpicking server
#BINPICKING_SRV_PORT = 11003

# Robot brand
BRAND_ID = 'DOOSAN/1.6.0_XXXXXXXXXXX'

# This determines byteorder for sending data and representing received data.
# Native robot controller endianness is 'little' (tested using sys.byteorder)
ENDIANNESS = 'little'
BYTEORDER_FMT = {'little': '<', 'big': '>'}[ENDIANNESS]


def __auxi_get_dict_from_class_consts(c):
    """
    Helper function that returns Name Dictionary (ND) for enum-like classes
    """
    names = list(filter(lambda n: all(c.isupper() for c in n.split('_')), dir(c)))
    ids = [getattr(c, e) for e in names]
    return dict(zip(ids, names))


def get_header(payload_size, request_id):
    data = struct.pack(BYTEORDER_FMT + '5i', ord('P'), ord('H'), ord('O'), payload_size, request_id)
    return data


# Request types
class PhoRequest:
    SCAN = 1
    TRAJECTORY = 2
    INITIALIZE = 4
    CALIB_ADD_POINT = 5
    CUSTOMER = 6
    PICK_FAILED = 7
    OBJECT_POSE = 8
    CHANGE_SOLUTION = 9
    START_SOLUTION = 10
    STOP_SOLUTION = 11
    GET_RUNNING_SOLUTION = 12
    GET_AVAILABLE_SOLUTIONS = 13


# Dictionary with Request names and IDs
PhoRequestND = __auxi_get_dict_from_class_consts(PhoRequest)


# Operation types
class PhoOperationType:
    TRAJECTORY_CNT = 0
    TRAJECTORY_FINE = 1
    GRIPPER = 2
    ERROR = 3
    INFO = 4
    OBJECT_POSE = 5


# Dictionary with Operation names and IDs
PhoOperationTypeND = __auxi_get_dict_from_class_consts(PhoOperationType)


# Gripper commands
class PhoGripperCmd:
    ATTACH = 1
    DETACH = 2
    USER_1 = 3
    USER_2 = 4
    USER_3 = 5


# Dictionary with Gripper commands names and IDs
PhoGripperCmdND = __auxi_get_dict_from_class_consts(PhoGripperCmd)


# Info commands operations numbers
class PhoOperationInfo:
    TOOL_POINT_INV = 1
    GRIPPING_ID = 2
    GRIPPING_POINT_INV = 3


# Dictionary with Info commands names and IDs
PhoOperationInfoND = __auxi_get_dict_from_class_consts(PhoOperationInfo)


# Error codes: communication
class PhoCommErr:
    OK = 0
    SERVICE_ERR = 1
    UNKNOWN_REQ = 2
    COMM_FAILURE = 3
    BAD_DATA = 4
    TIMEOUT = 5


# Dictionary with communication error names and IDs
PhoCommErrND = __auxi_get_dict_from_class_consts(PhoCommErr)

PHO_COMM_ERR_STOP = True


# Error codes: Binpicking
class PhoBipiErr:
    PLANNING_FAILED = 201
    NO_PART_FOUND = 202
    NOT_INITIALIZED = 203
    EMPTY_SCENE = 218
    WRONG_BP_CONF = 255


# Dictionary with Binpicking error names and IDs
PhoBipiErrND = __auxi_get_dict_from_class_consts(PhoBipiErr)

# ===== GLOBAL VARIABLES =====

# User Error Info
pho_err_occurred = False
pho_err_code = PhoCommErr.OK

# User Info Variables
pho_tool_point_invariance = -1
pho_gripping_point_id = -1
pho_gripping_point_invariance = -1
pho_info_data = []

# Currently sent requests awaiting response
pho_requests_blocked = False  # True if there's a blocking request and cannot send another one

# Last rquest ID
pho_last_request_id = None

# Operation related variables
pho_trajectory_buffer = []  # 'list' of 'posj' joint poses for trajectory waypoints
pho_trajectory_type = []  # (bool) if trajectory on the same index si "FINE" (or "CNT")
pho_operations = []  # stores operations order from  TRAJECTORY request responses

# pho_num_of_operations = 0
pho_object_pose = None

# Calibration related variables
pho_reprojection_error = -1

# Pick allowed flag
pho_pick_allowed = False

# Bin picking speed and acceleration data
pho_speed_data = []
pho_acceleration_data = []

# solutions
pho_running_solution = -1
pho_available_solutions = []


# Auxiliary functions
def __int2ord(i):
    """
    :param i: integer
    :return: string representing ordinal number of i
    """
    if abs(i) > 3 or i == 0:
        return '{}-th'.format(i)
    else:
        return '{}-{}'.format(i, ['st', 'nd', 'rd'][i - 1])


# ===== COMMON =====
bps_client_socket = None


def deg_2_rad(deg):
    rad = []
    for d in deg:
        tmp = d2r(d)
        rad.append(round(tmp, 5))
    return tuple(rad)


def rad_2_deg(rad):
    deg = []
    for r in rad:
        tmp = r2d(r)
        deg.append(round(tmp, 5))
    return deg


def handle_socket_read_error(response, set_err_code, log=True, message1='', message2=''):
    global PHO_DEBUG, pho_err_code
    if response >= 0:
        if set_err_code: pho_err_code = PhoCommErr.BAD_DATA
        if log or PHO_DEBUG:
            tp_log(message1 + ' Did receive incorrect length of data ({}B). '.format(response) + message2)
    elif response == -1:
        if set_err_code: pho_err_code = PhoCommErr.COMM_FAILURE
        if log or PHO_DEBUG:
            tp_log(message1 + ' The client is not connected (-1). ' + message2)
    elif response == -2:
        if set_err_code: pho_err_code = PhoCommErr.COMM_FAILURE
        if log or PHO_DEBUG:
            tp_log(message1 + ' Socket.error occurred during data reception (-2). ' + message2)
    elif response == -3:
        if set_err_code: pho_err_code = PhoCommErr.TIMEOUT
        if log or PHO_DEBUG:
            tp_log(message1 + ' Timeout during data reception. Expected version data (-3). ' + message2)
    else:
        if set_err_code: pho_err_code = PhoCommErr.BAD_DATA
        if log or PHO_DEBUG:
            tp_log(message1 + ' Unknown socket reading error ({})'.format(response) + message2)


def handle_socket_write_error(status, log=True, message1='', message2='', set_pho_err=True):
    global PHO_DEBUG, pho_err_code, pho_err_occurred
    if set_pho_err:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE

    if status == -1:
        if log or PHO_DEBUG:
            tp_log(message1 + ' The client is not connected (-1). ' + message2)
    elif status == -2:
        if log or PHO_DEBUG:
            tp_log(message1 + ' Server/Client is disconnected, or socket.error occurred during a data transfer (-2). '
                   + message2)
    else:
        if log or PHO_DEBUG:
            tp_log(message1 + ' Unknown error during socket write ({}) '.format(status) + message2)


def bps_client_open_socket(server_ip):
    """
    Connect as a client to BPS server.
    """
    global bps_client_socket, BINPICKING_SRV_PORT, pho_err_occurred, pho_err_code
    try:
        bps_client_socket = client_socket_open(server_ip, BINPICKING_SRV_PORT)
        return True
    except:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE
        tp_log('Connection to Vision Controller failed.')
        return False


def bps_client_flush_socket():
    global bps_client_socket
    flag = True
    while flag:
        response, _ = client_socket_read(bps_client_socket, length=4, timeout=0.05)
        flag = response > 0


def bps_client_check_version():
    """
    Checks if the version of Binpicking on Robot controller and Vision controller match
    :return: True if match, False if not or if an error occurred
    """
    global bps_client_socket, pho_err_occurred, BRAND_ID

    # Send version info to Vision controller
    data = struct.pack('24s', BRAND_ID.encode(encoding='UTF-8'))
    status = client_socket_write(bps_client_socket, data)

    if status != 0:
        handle_socket_write_error(status, False, 'Unable to send the Robot ID to the Vision Controller.')
        return False

    return True


def pho_wait_for_server(server_ip):
    """
    Function to establish connection to the Vision Controller
    :param server_ip: string with IPv4 address of Vision Controller (Robot interface)
    :return: True on success, False otherwise
    """
    global bps_client_socket, pho_err_occurred, pho_err_code

    connected = False

    # First try to close opened socket in case there was an error
    if bps_client_socket:
        try:
            client_socket_close(bps_client_socket)
        except:
            pass

    # Try to connect (there's no timeout possible, only exceptions)
    tp_log('Connecting to Vision Controller...')
    try:
        connected = bps_client_open_socket(server_ip)
    except:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE
        return False

    if connected:
        # Reset errors since the connection succeeded
        pho_err_occurred = False
        pho_err_code = PhoCommErr.OK

        # Check versions
        if bps_client_check_version():
            tp_log('Connection to Vision Controller established. IP: {}'.format(server_ip))
            return True


def bps_client_send_request(request_id, vs_id, data=b''):
    """
    Appends data to standard header and sends request to Vision Controller
    :param request_id: Request ID. Valid values are defined in PhoRequest class
    :param vs_id: Vision System ID
    :param data: data in bytes to be send after header, i.e. 'PHO', req_id, vs_id
    :return: True if the request was successfully sent, False otherwise
    """
    global bps_client_socket, PHO_HEADER, BYTEORDER_FMT, PHO_DEBUG, PhoRequestND, pho_requests_blocked, \
        pho_err_occurred, pho_err_code, pho_last_request_id, pho_tool_point_invariance, pho_gripping_point_id, \
        pho_gripping_point_invariance

    if request_id not in PhoRequestND.keys():
        pho_err_occurred = True
        tp_log('Unknown request id: {}'.format(request_id))
        return False

    # Check socket status
    socket_status = client_socket_state(bps_client_socket)
    if socket_status != 1:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE
        return False

    bps_client_flush_socket()

    # Check if any unresolved request is blocking sending of this one
    if pho_requests_blocked:
        tp_popup('The "{}" request is blocked by the previous one!'.format(PhoRequestND[request_id]))
        pho_err_occurred = True
        return False

    # Requests related witch solutions operations, add calibration point
    if (9 <= request_id <= 13) or request_id == 5:
        pass
    else:
        data = vs_id.to_bytes(4, ENDIANNESS) + data

    data_size = len(data) // 4

    msg = get_header(payload_size=data_size, request_id=request_id)
    msg += data

    if PHO_DEBUG:
        tp_log('Sending Binpicking request: "{}"'.format(PhoRequestND[request_id]))

    status = client_socket_write(bps_client_socket, msg)
    if status != 0:
        msg = 'Binpicking client: Sending "{}" request has failed'.format(PhoRequestND[request_id])
        handle_socket_write_error(status, False, msg)
        return False
    else:
        # Sending the request succeeded => set blocking flag
        pho_last_request_id = request_id
        pho_requests_blocked = True
        return True


def bps_client_handle_operation_error(read_bytes, request_id):
    global bps_client_socket, pho_err_occurred, pho_err_code, PhoRequestND
    response, op_data = client_socket_read(bps_client_socket, length=read_bytes, timeout=-1)

    if response != read_bytes:
        pho_err_occurred = True
        msg = 'Error while reading operation data from request "{}".'.format(PhoRequestND[request_id])
        handle_socket_read_error(response, True, False, msg)

    (pho_err_code,) = struct.unpack(BYTEORDER_FMT + 'i', op_data)

    if pho_err_code != PhoCommErr.OK:
        pho_err_occurred = True
        msg = 'Wrong BP configuration! More details in Bin Picking Studio console. ({})'.format(pho_err_code)
        tp_log(msg)


def bps_client_handle_operation_trajectory(waypoints_count, fine, wait_time=0.5):
    """
    Receives one trajectory from BinPicking server (corresponding to 1 subheader)
    :param waypoints_count: or data array count; defined in the received header
    :param fine: (bool) defined by the received operation type
    :param wait_time: time to wait for receiving a single waypoint
    """
    global bps_client_socket, PHO_DEBUG, pho_err_occurred, pho_err_code, pho_trajectory_buffer, pho_trajectory_type

    WAYPOINT_MSG_SIZE = 32

    # Get index for saving waypoints to 'pho_trajectory_buffer' list
    trajectory_id = len(pho_trajectory_buffer)

    # Append list with 'fine' flag + waypoints placeholder for a new trajectory
    pho_trajectory_buffer.append([posj()] * waypoints_count)
    pho_trajectory_type.append(fine)

    for wp_id in range(waypoints_count):
        response, wp_data = client_socket_read(bps_client_socket, length=WAYPOINT_MSG_SIZE, timeout=wait_time)
        if response != WAYPOINT_MSG_SIZE:
            if PHO_DEBUG:
                msg = 'Error receiving {} waypoint.'.format(__int2ord(wp_id + 1))
                handle_socket_read_error(response, False, False, msg)
            pho_err_occurred = True
            pho_err_code = PhoCommErr.BAD_DATA
            return False

        unpacked_data = struct.unpack(BYTEORDER_FMT + 'i7f', wp_data)
        wp_msg_id = unpacked_data[0]
        joints = posj(*unpacked_data[1:7])
        joint_msg_crc = unpacked_data[7]
        joint_crc = sum(joints)

        # Check if the data are valid
        if (abs(joint_msg_crc - joint_crc) < 0.001) and (wp_msg_id == wp_id + 1):
            # Add waypoint to current trajectory data
            joints_deg = rad_2_deg(joints)
            pho_trajectory_buffer[trajectory_id][wp_id] = posj(joints_deg)
        else:
            msg = ''
            if wp_msg_id != wp_id + 1:
                msg += 'Incorrect waypoint ID received ({}, expected: {})! '.format(wp_msg_id, wp_id + 1)
            if not (abs(joint_msg_crc - joint_crc) < 0.001):
                msg += 'Joints checksum is incorrect (actual: {}, expected: {})!'.format(joint_crc, joint_msg_crc)

            tp_popup('Error while receiving trajectory! ' + msg, DR_PM_ALARM, 1)
            pho_err_occurred = True
            pho_err_code = PhoCommErr.BAD_DATA
            return False
    return True


def bps_client_handle_operation_other(request_id, wait_time=0.5):
    """
    Receives the data corresponding to subheaders which are followed by data consisting of a single integer
    :return: received int on success, None on failure
    """
    global bps_client_socket, pho_err_occurred, pho_err_code, PhoRequestND

    MSG_BYTES = 4
    response, op_data = client_socket_read(bps_client_socket, length=MSG_BYTES, timeout=wait_time)

    if response != MSG_BYTES:
        pho_err_occurred = True
        msg = 'Error while reading operation data from request "{}".'.format(PhoRequestND[request_id])
        handle_socket_read_error(response, True, False, msg)
        return None

    (msg,) = struct.unpack(BYTEORDER_FMT + 'i', op_data)
    return msg


def bps_client_handle_received_available_solutions(solutions_count, wait_time=0.5):
    """
    Received ids of available solutions
    :return: List of ids of available solutions
    """
    global bps_client_socket, pho_err_occurred, pho_err_code, PhoRequestND

    MSG_BYETS = 4
    available_solutions_list = []

    for solution in range(solutions_count):
        response, solution_id = client_socket_read(bps_client_socket, length=MSG_BYETS, timeout=wait_time)
        if response != MSG_BYETS:
            pho_err_occurred = True
            msg = 'Error while reading available solutions "{}".'.format(PhoRequestND[13])
            handle_socket_read_error(response, True, False, msg)
            return None

        (msg,) = struct.unpack(BYTEORDER_FMT + 'i', solution_id)
        available_solutions_list.append(msg)

    return available_solutions_list


def bps_client_handle_operation_object_pose(request_id, wait_time=0.5):
    """
    Receives the data corresponding to subheader with operation type PhoOperationType.OBJECT_POSE
    Check 'posx()' documentation for rotation explanation
    :return: 'posx' object on success, None on failure
    """
    global bps_client_socket, pho_err_occurred, pho_err_code, PhoRequestND
    MSG_BYTES = 24  # x, y, z, Rz, Ry, Rz'
    response, op_data = client_socket_read(bps_client_socket, length=MSG_BYTES, timeout=wait_time)

    if response != MSG_BYTES:
        pho_err_occurred = True
        msg = 'Error while reading "pose" operation data from request "{}".'.format(PhoRequestND[request_id])
        handle_socket_read_error(response, True, False, msg)
        return None

    x, y, z, rz, ry, rz2 = struct.unpack(BYTEORDER_FMT + '6f', op_data)
    rot_deg = rad_2_deg([rz, ry, rz2])
    return posx(x, y, z, rot_deg[0], rot_deg[1], rot_deg[2])


def bps_client_recv_response(request_id, wait_time):
    """
    Receives responses to previously sent requests to BPS server.
    :param request_id: (int) ID of sent request, for which a response is to be received.
    :param wait_time: (float) Time to wait for response in seconds
    :return: True if no error occurred, False otherwise
    """
    global BYTEORDER_FMT, bps_client_socket, pho_err_code, pho_err_occurred, pho_requests_blocked, \
        PhoRequestND, PhoOperationTypeND, PhoGripperCmdND, PhoOperationInfoND, pho_info_data, \
        pho_tool_point_invariance, pho_gripping_point_id, pho_gripping_point_invariance, \
        pho_object_pose, pho_reprojection_error, pho_last_request_id, pho_running_solution, \
        pho_available_solutions

    # Check if correct request was sent preceding this receive call
    if request_id != pho_last_request_id:
        pho_err_occurred = True
        if pho_last_request_id is None:
            tp_popup('Program flow error. Missing request call preceding the current response call.', DR_PM_ALARM, 1)
        else:
            tp_popup('Program flow error. Incorrect request call preceding the current response call. '
                   'Expected "{}"'.format(PhoRequestND.get(request_id, request_id)), DR_PM_ALARM, 1)
        return False

    if request_id not in PhoRequestND.keys():
        pho_err_occurred = True
        tp_log('Unknown request id: {}'.format(request_id))
        return False

    HEADER_SIZE = 12
    SUB_HEADER_SIZE = 12

    # Check socket status
    socket_status = client_socket_state(bps_client_socket)
    if socket_status != 1:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE
        return not pho_err_occurred

    # Clear flags from previous request
    pho_err_occurred = False
    pho_err_code = PhoCommErr.OK
    pho_last_request_id = None

    # Wait for message header
    response, data = client_socket_read(bps_client_socket, length=HEADER_SIZE, timeout=wait_time)

    if response != HEADER_SIZE:
        pho_err_occurred = True
        handle_socket_read_error(response, True, True, 'Binpicking client.', 'Expected header data.')
        return not pho_err_occurred

    recv_req_id, n_subheaders, _ = struct.unpack(BYTEORDER_FMT + '3i', data)

    # Check if response matches the request type
    if recv_req_id != request_id:
        tp_log('ERROR: Request was "{}" ({}). Received "{}" ({})'.format(
            PhoRequestND[request_id], request_id, PhoRequestND.get(recv_req_id, '?'), recv_req_id))

        pho_err_occurred = True
        pho_err_code = PhoCommErr.BAD_DATA
        bps_client_flush_socket()

        return not pho_err_occurred

    if PHO_DEBUG:
        tp_log('Response to "{}" request: header: {} subheaders'.format(PhoRequestND[request_id], n_subheaders))

    # Start reading & processing subheaders
    for i_sub in range(n_subheaders):

        # Read subheader
        response, data = client_socket_read(bps_client_socket, length=SUB_HEADER_SIZE, timeout=wait_time)

        if response != SUB_HEADER_SIZE:
            pho_err_occurred = True
            handle_socket_read_error(response, True, True, 'Binpicking client.',
                                     'Expected {} sub-header data ({}B).'.format(__int2ord(i_sub), SUB_HEADER_SIZE))
            break

        operation_type, operation_number, data_array_count = struct.unpack(BYTEORDER_FMT + '3i', data)

        if PHO_DEBUG:
            tp_log('Read subheader {}. Operation type/number/data_array_count: {}/{}/{}'.format(
                i_sub,
                PhoOperationTypeND.get(operation_type, str(operation_type)),
                operation_number,
                data_array_count
            ))

        if request_id == PhoRequest.TRAJECTORY:
            pho_operations.append(operation_type)

        if operation_type == PhoOperationType.TRAJECTORY_CNT:
            bps_client_handle_operation_trajectory(data_array_count, False, wait_time)
        elif operation_type == PhoOperationType.TRAJECTORY_FINE:
            bps_client_handle_operation_trajectory(data_array_count, True, wait_time)
        elif operation_type == PhoOperationType.GRIPPER:
            gripper_op = bps_client_handle_operation_other(request_id)
            if PHO_DEBUG:
                tp_log('Received gripper operation: {} (operation number: {})'.format(gripper_op, operation_number))
        elif operation_type == PhoOperationType.ERROR:
            bps_client_handle_operation_error(data_array_count * 4, request_id)
            if pho_err_occurred:
                break
        elif operation_type == PhoOperationType.INFO:
            if recv_req_id == PhoRequest.GET_RUNNING_SOLUTION:
                pho_running_solution = bps_client_handle_operation_other(request_id)
                if PHO_DEBUG:
                    tp_log('Received running solution: {}'.format(pho_running_solution))
            elif recv_req_id == PhoRequest.GET_AVAILABLE_SOLUTIONS:
                pho_available_solutions = bps_client_handle_received_available_solutions(data_array_count)
                tp_log('available solutions: {}'.format(pho_available_solutions))
                pass
            else:
                pho_info = bps_client_handle_operation_other(request_id)
                pass
                if operation_number == PhoOperationInfo.TOOL_POINT_INV:
                    pho_tool_point_invariance = pho_info
                    if PHO_DEBUG:
                        tp_log('Received Info operation: tool_point_invariance: {}'.format(pho_info))
                elif operation_number == PhoOperationInfo.GRIPPING_ID:
                    pho_gripping_point_id = pho_info
                    if PHO_DEBUG:
                        tp_log('Received Info operation: gripping_point_id: {}'.format(pho_info))
                elif operation_number == PhoOperationInfo.GRIPPING_POINT_INV:
                    pho_gripping_point_invariance = pho_info
                    if PHO_DEBUG:
                        tp_log('Received Info operation: gripping_point_invariance: {}'.format(pho_info))
                else:
                    pho_info_data.append(pho_info)
                    if PHO_DEBUG:
                        tp_log('Received Info: {}'.format(pho_info))

        elif operation_type == PhoOperationType.OBJECT_POSE:
            pho_object_pose = bps_client_handle_operation_object_pose(request_id)
        else:
            msg = 'Response to "{}" request: Unknown type of operation received: {}'.format(
                PhoRequestND[request_id],
                PhoOperationTypeND.get(operation_type, )
            )
            tp_popup(msg, DR_PM_MESSAGE, 0)
            pho_err_occurred = True
            pho_err_code = PhoCommErr.UNKNOWN
            break
    return not pho_err_occurred


def pho_request_init(pho_start_bin_picking_pose, pho_end_bin_picking_pose, vision_system_id, wait_time=-1):
    """
    Request to initialize a bin picking session
    Sends start and end poses to Binpicking server.
    :param pho_start_bin_picking_pose: start pose. (posj) object or iterable with joint 1 - 6 states [deg]
    :param pho_end_bin_picking_pose: end pose. (posj) object or iterable with joint 1 - 6 states [deg]
    :param vision_system_id: (int) ID of the vision system
    :param wait_time: time to wait for response [sec]
    """
    global BYTEORDER_FMT, pho_requests_blocked

    start_pose_rad = deg_2_rad(pho_start_bin_picking_pose)
    end_pose_rad = deg_2_rad(pho_end_bin_picking_pose)
    joints_deg = [j_rad for j_rad in start_pose_rad] + [j_rad for j_rad in end_pose_rad]

    data = struct.pack(BYTEORDER_FMT + '12f', *joints_deg)

    if bps_client_send_request(PhoRequest.INITIALIZE, vision_system_id, data):
        bps_client_recv_response(PhoRequest.INITIALIZE, wait_time)
        pho_requests_blocked = False


def pho_request_scan(vision_system_id):
    """
    Sends a scan request
    """
    global PHO_DEBUG

    if PHO_DEBUG:
        tp_log('Binpicking client: Sending SCAN request for VS {}...'.format(vision_system_id))

    bps_client_send_request(PhoRequest.SCAN, vision_system_id)


def pho_request_trajectory(vision_system_id):
    """
    Sends request to receive a new trajectory
    """
    global pho_pick_allowed, pho_trajectory_buffer, pho_operations

    # Clear buffers from the previous trajectories
    pho_trajectory_buffer = []
    pho_operations = []

    bps_client_send_request(PhoRequest.TRAJECTORY, vision_system_id)
    pho_pick_allowed = False


def pho_request_calib_add_point():
    """
    Request to add point to calibration. Function is waiting for a confirmation from Vision Controller
    """
    global pho_requests_blocked
    if bps_client_send_request(PhoRequest.CALIB_ADD_POINT, 0):
        bps_client_recv_response(PhoRequest.CALIB_ADD_POINT, -1)
        pho_requests_blocked = False


def pho_request_send_pick_failed(vision_system_id):
    """
    Request to send pick failed
    """
    global pho_requests_blocked
    if bps_client_send_request(PhoRequest.PICK_FAILED, vision_system_id):
        bps_client_recv_response(PhoRequest.PICK_FAILED, -1)
        pho_requests_blocked = False


def pho_request_change_solution(required_solution_id):
    """
    Request for solution change
    """
    global pho_requests_blocked, BYTEORDER_FMT

    data = struct.pack(BYTEORDER_FMT + 'i', required_solution_id)

    if bps_client_send_request(PhoRequest.CHANGE_SOLUTION, 0, data):
        bps_client_recv_response(PhoRequest.CHANGE_SOLUTION, -1)
        pho_requests_blocked = False


def pho_request_start_solution(required_solution_id):
    """
    Request for start solution
    """
    global pho_requests_blocked, BYTEORDER_FMT

    data = struct.pack(BYTEORDER_FMT + 'i', required_solution_id)

    if bps_client_send_request(PhoRequest.START_SOLUTION, 0, data):
        bps_client_recv_response(PhoRequest.START_SOLUTION, -1)
        pho_requests_blocked = False


def pho_request_stop_solution():
    """
    Request for stop solution
    """
    global pho_requests_blocked, BYTEORDER_FMT

    if bps_client_send_request(PhoRequest.STOP_SOLUTION, 0):
        bps_client_recv_response(PhoRequest.STOP_SOLUTION, -1)
        pho_requests_blocked = False


def pho_request_get_running_solution():
    """
    Request for get running solution
    """
    global pho_requests_blocked, BYTEORDER_FMT

    if bps_client_send_request(PhoRequest.GET_RUNNING_SOLUTION, 0):
        bps_client_recv_response(PhoRequest.GET_RUNNING_SOLUTION, -1)
        pho_requests_blocked = False


def pho_request_get_available_solutions():
    """
    Request for get available solutions
    """
    global pho_requests_blocked, BYTEORDER_FMT

    if bps_client_send_request(PhoRequest.GET_AVAILABLE_SOLUTIONS, 0):
        bps_client_recv_response(PhoRequest.GET_AVAILABLE_SOLUTIONS, -1)
        pho_requests_blocked = False


def pho_request_object_pose(vision_system_id):
    """
    Request for an object pose
    """
    global pho_requests_blocked
    if bps_client_send_request(PhoRequest.OBJECT_POSE, vision_system_id):
        bps_client_recv_response(PhoRequest.OBJECT_POSE, -1)
        pho_requests_blocked = False


def pho_other_req(vision_system_id, data):
    """
    Request to send other customer data
    :param vision_system_id: (int) ID of the Vision System
    :param data: (bytes) data to be sent
    """
    global pho_requests_blocked, pho_err_occurred, pho_err_code

    if type(data) is not bytes:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.BAD_DATA
        tp_log('Error: incorrect data in customer request! Expecting bytes, got "{}".'.format(type(data)))
        return

    bps_client_send_request(PhoRequest.CUSTOMER, vision_system_id, data)
    pho_requests_blocked = False  # Not expecting any response


# ===== RESPONSES =====
def pho_wait_for_scan_completion(wait_time=-1):
    """
    Function to wait for confirmation message from the Vision Controller that the scanning has finished
    """
    global PHO_DEBUG, pho_err_occurred, pho_err_code, pho_requests_blocked

    if pho_err_occurred:
        if pho_err_code in [PhoCommErr.TIMEOUT, PhoCommErr.BAD_DATA, PhoCommErr.COMM_FAILURE]:
            return

    bps_client_recv_response(PhoRequest.SCAN, wait_time)
    pho_requests_blocked = False


def pho_receive_trajectory(wait_time=-1):
    """
    Receives a new trajectory from the Vision Controller after requesting it
    """
    global pho_pick_allowed, pho_requests_blocked, pho_err_occurred, pho_err_code

    if pho_err_occurred:
        if pho_err_code in [PhoCommErr.TIMEOUT, PhoCommErr.BAD_DATA, PhoCommErr.COMM_FAILURE]:
            return

    bps_client_recv_response(PhoRequest.TRAJECTORY, wait_time)
    pho_requests_blocked = False
    pho_pick_allowed = True





# CustomerDefinitions module v.1.6
# Copyright(c) 2022 Photoneo s.r.o.
# All rights reserved

# Implement gripper commands and adapt binpicking sequences to meet your application requirements

# -----------------------------------------------------------------------------
# -------------------- GRIPPER COMMANDS TO BE IMPLEMENTED ---------------------
# -----------------------------------------------------------------------------

# Implement command to attach part to gripper here
def gripper_attach():
    pass


# Implement command to detach part from gripper here
def gripper_detach():
    pass


# Implement your custom gripper command here
def gripper_user_1():
    pass


# Implement your custom gripper command here
def gripper_user_2():
    pass


# Implement your custom gripper command here
def gripper_user_3():
    pass


# -----------------------------------------------------------------------------
# ------------------------ BIN PICKING SPEED SETTINGS -------------------------
# -----------------------------------------------------------------------------

def binpicking_settings():
    """
    Set the joint speeds and accelerations for gripping path stages defined in Binpicking solution.
    Values are in [degrees per second] / [degrees per second^2].
    For each trajectory is possible to use a float value, which sets the same speed for each joint
    or a list of 6 floats, i.e. speed for joint 1 ... 6. [j1, j2, j3, j4, j5, j6]
    Acceleration settings are analogous to the speed settings.
    """
    global pho_speed_data, pho_acceleration_data

    # Init/reset the global settings
    pho_speed_data = []
    pho_acceleration_data = []

    # Maximal joint velocities for Doosan M1013 (j1, ...,j6) [degrees per second]
    # Adjust the joint velocities as appropriate for your application. Note that real velocities may be lower
    # than values defined here - depending on the distances of trajectory waypoints
    max_velocity = [120.0, 120.0, 180.0, 225.0, 225.0, 225.0]

    # Joint accelerations for (j1, ...,j6) [degrees per second^2]
    # Adjust the joint accelerations as appropriate for your application. Note that real accelerations may be lower
    # than values defined here - depending on the distances of trajectory waypoints
    acceleration = [400] * 6

    # 1st trajectory speed (Approach trajectory by default)
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 2nd trajectory speed (Grasp trajectory by default)
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 3rd trajectory speed (Deapproach trajectory by default)
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 4th trajectory speed (End trajectory by default)
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 5th trajectory speed
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 6th trajectory speed
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)


# -----------------------------------------------------------------------------
# ------------------------BIN PICKING IMPLEMENTATIONS -------------------------
# -----------------------------------------------------------------------------


def pho_bin_picking():
    """
    DO NOT EDIT!!!
    Standard bin picking implementation
    Allows for an execution of various number of operations. Joint velocities and accelerations
    are defined in 'binpicking_settings()'
    """
    global PHO_DEBUG, pho_trajectory_buffer, pho_operations, pho_speed_data, pho_acceleration_data, \
        pho_err_occurred, pho_pick_allowed

    trajectory_id = 0
    gripper_cmd_id = 1  # PhoGripperCmd.ATTACH

    # Set velocities and accelerations
    binpicking_settings()

    # Make sure that no errors occurred, otherwise return from the function
    if not pho_err_occurred:
        if not pho_pick_allowed:
            msg = 'Program flow error! Pick rejected. Possible causes: Repeated call: pho_bin_picking() OR '
            msg += 'Missing call: pho_receive_trajectory()'
            tp_popup(msg, DR_PM_ALARM, 1)
        else:
            # Execute received operations
            n_ops = len(pho_operations)
            for i, operation in enumerate(pho_operations):
                if PHO_DEBUG:
                    tp_log(
                        'operation {} of {}: {}({})...'.format(i, n_ops, PhoOperationTypeND.get(operation, '?'), operation))

                if operation in [PhoOperationType.TRAJECTORY_FINE, PhoOperationType.TRAJECTORY_CNT]:
                    velocity = pho_speed_data[trajectory_id]
                    acceleration = pho_acceleration_data[trajectory_id]

                    # Execute the movement (the robot have to start in the waypoint at index 0)
                    movesj(pho_trajectory_buffer[trajectory_id][1:], v=velocity, a=acceleration)
                    trajectory_id += 1

                elif operation == PhoOperationType.GRIPPER:
                    execute_gripper(gripper_cmd_id)
                    gripper_cmd_id += 1

    # Reset pick allowed flag
    pho_pick_allowed = False


def pho_execute_trajectory(trajectory_id, velocity=-1, acceleration=-1):
    """
    Executes a single trajectory
    :param trajectory_id: ID of the trajectory to execute
    :param velocity: positive float value or a list of 6 such values of joint velocities [deg/s] *
    :param acceleration: positive float value or a list of 6 such values of joint velocities [deg/s^2] *
    * otherwise global settings will be used from 'pho_speed_data', 'pho_acceleration_data'
    """
    global PHO_DEBUG, pho_trajectory_buffer, pho_operations, pho_speed_data, pho_acceleration_data
    use_velocity = 0
    use_acceleration = 0

    if PHO_DEBUG:
        tp_log('Executing trajectory {}'.format(trajectory_id))

    # Check if requested trajectory ID exists, exit if not
    if 0 <= trajectory_id < len(pho_trajectory_buffer):
        trajectory_waypoints = pho_trajectory_buffer[trajectory_id]

        # Determine which velocity will be used
        if hasattr(velocity, '__len__'):
            if len(velocity) == 6:
                use_velocity = velocity
        elif velocity > 0:
            use_velocity = velocity
        else:
            use_velocity = pho_speed_data[trajectory_id]

        # Determine which acceleration will be used
        if hasattr(acceleration, '__len__'):
            if len(acceleration) == 6:
                use_acceleration = acceleration
        elif acceleration > 0:
            use_acceleration = acceleration
        else:
            use_acceleration = pho_acceleration_data[trajectory_id]

        # Execute the movement (the robot have to start in the waypoint at index 0)
        movesj(trajectory_waypoints[1:], v=use_velocity, a=use_acceleration)


def execute_gripper(gripper_cmd_id):
    """
    Calls user defined code for executing a gripper command
    :param gripper_cmd_id: constant defined in PhoGripperCmd
    """
    if gripper_cmd_id == PhoGripperCmd.ATTACH:
        gripper_attach()
    elif gripper_cmd_id == PhoGripperCmd.DETACH:
        gripper_detach()
    elif gripper_cmd_id == PhoGripperCmd.USER_1:
        gripper_user_1()
    elif gripper_cmd_id == PhoGripperCmd.USER_2:
        gripper_user_2()
    elif gripper_cmd_id == PhoGripperCmd.USER_3:
        gripper_user_3()

#################### test_function ####################


#STATE_SRV_PORT = 11004
result_RobotStateServer = False
def _RobotStateServerCheck():
    global STATE_SRV_PORT, stsrv_socket
    global result_RobotStateServer
   
    tp_log('State server: waiting for a new connection')
    
    stsrv_socket = server_socket_open(STATE_SRV_PORT)
    if stsrv_check_version():
        status=0
        data = stsrv_send_joints_state()
        status_joint = server_socket_write(stsrv_socket, data)
        if status_joint != 0:
            stsrv_handle_socket_write_error(status_joint, True, 'An error occurred while sending joint status')

        data = stsrv_send_tcp_state()
        status_tcp = server_socket_write(stsrv_socket, data)
        if status_tcp != 0:
            stsrv_handle_socket_write_error(status_tcp, True, 'An error occurred while sending tcp status')

        status = status_joint + status_tcp
        wait(0.1)

        if status == 0:
            result_RobotStateServer = True

        server_socket_close(stsrv_socket)
    tp_log('State server: Vision Controller has disconnected')


#BINPICKING_SRV_PORT = 11003
#BINPICKING_SRV_IP = '192.168.137.10'
result_BinPickingClient = False
def _BinPickingClientCheck():
    global BINPICKING_SRV_PORT, bps_client_socket
    global result_BinPickingClient
    
    # First try to close opened socket in case there was an error
    if bps_client_socket:
        try:
            client_socket_close(bps_client_socket)
        except:
            pass

    # Try to connect (there's no timeout possible, only exceptions)
    tp_log('Connecting to Vision Controller...')
    bps_client_socket = client_socket_open(BINPICKING_SRV_IP, BINPICKING_SRV_PORT)

    # Check versions
    if bps_client_check_version():
        tp_log('Connection to Vision Controller established. IP: {}'.format(BINPICKING_SRV_IP))
        result_BinPickingClient = True

    if bps_client_socket:
        try:
            client_socket_close(bps_client_socket)
        except:
            pass


`

export const DRL_port_test_ALL = `
# robot state server port check
thread_run(_RobotStateServerCheck)

# bin picking client port check
thread_run(_BinPickingClientCheck)

wait(5)
`
    
export const DRL_port_test_RSS = `
# robot state server port check
thread_run(_RobotStateServerCheck)

wait(5)
`

export const DRL_port_test_BPS = `
# bin picking client port check
thread_run(_BinPickingClientCheck)

wait(5)
`

export const DRL_Calibration_run = `
# StateServer module v.1.6
# Copyright(c) 2022 Photoneo s.r.o.
# All rights reserved

# -----------------------------------------------------------------------------
# --------------------------- PHOTONEO STATE SERVER ---------------------------
# -----------------------------------------------------------------------------

import struct

# Default port of state server
#STATE_SRV_PORT = 11004


JOINT_STATE_MSG_ID = 1
TOOL_POSE_MSG_ID = 2

# This determines byteorder for sending data and representing received data.
# Native robot controller endianness is 'little' (tested using sys.byteorder)
ENDIANNESS = 'little'
BYTEORDER_FMT = {'little': '<', 'big': '>'}[ENDIANNESS]

JOINTS_STATE_FMT = '6f'
JOINTS_STATE_BYTES = struct.calcsize(JOINTS_STATE_FMT)

TOOL0_POSE_FMT = '6f'
TOOL0_POSE_BYTES = struct.calcsize(TOOL0_POSE_FMT)

stsrv_socket = None

PHO_DEBUG_STSRV = False
# Robot brand
BRAND_ID = 'DOOSAN/1.6.0_XXXXXXXXXXX'

def get_header(payload_size, request_id):
    data = struct.pack(BYTEORDER_FMT + '5i', ord('P'), ord('H'), ord('O'), payload_size, request_id)
    return data
def stsrv_handle_socket_write_error(status, log=True, message1='', message2=''):
    global PHO_DEBUG_STSRV

    if status == -1:
        if log or PHO_DEBUG_STSRV:
            tp_log(message1 + ' The client is not connected (-1). ' + message2)
    elif status == -2:
        if log or PHO_DEBUG_STSRV:
            tp_log(message1 + ' Server/Client is disconnected, or socket.error occurred during a data transfer (-2). '
                   + message2)
    else:
        if log or PHO_DEBUG_STSRV:
            tp_log(message1 + ' Unknown error during socket write ({}) '.format(status) + message2)


def get_tool0_pose():
    """
    Returns the current tool0
    position in robot (base) space in [mm]
    and orientation as Euler angles ZYZ [degrees]
    """
    return get_current_tool_flange_posx(DR_BASE)


def get_tool0_pose_as_bytes():
    global TOOL0_POSE_FMT, BYTEORDER_FMT
    pose = get_tool0_pose()
    data = struct.pack(BYTEORDER_FMT + TOOL0_POSE_FMT, *pose)
    return data


def get_joints_state_as_bytes():
    """
    Gets current joint states in degrees
    and converts the 6 floats (j1, ..j6) to bytes
    """
    global JOINTS_STATE_FMT, BYTEORDER_FMT
    joints_deg = get_current_posj()
    return struct.pack(BYTEORDER_FMT + JOINTS_STATE_FMT, *joints_deg)


def stsrv_open_socket():
    global STATE_SRV_PORT, stsrv_socket
    stsrv_socket = server_socket_open(STATE_SRV_PORT)


def stsrv_send_joints_state():
    global stsrv_socket, JOINT_STATE_MSG_ID
    data = get_header(payload_size=6, request_id=JOINT_STATE_MSG_ID)
    data += get_joints_state_as_bytes()
    return data


def stsrv_send_tcp_state():
    global stsrv_socket, TOOL_POSE_MSG_ID
    data = get_header(payload_size=6, request_id=TOOL_POSE_MSG_ID)
    data += get_tool0_pose_as_bytes()
    return data


def stsrv_check_version():
    global stsrv_socket, BRAND_ID

    data = struct.pack('24s', BRAND_ID.encode(encoding='UTF-8'))
    status = server_socket_write(stsrv_socket, data)

    if status != 0:
        stsrv_handle_socket_write_error(status, True, 'Unable to send the Robot ID to the Vision Controller', '')
        return False

    return True


def run_state_server():
    global stsrv_socket, PHO_DEBUG_STSRV

    tp_log('State server: waiting for a new connection')
    stsrv_open_socket()

    if stsrv_check_version():
        status = 0
        while status == 0:
            data = stsrv_send_joints_state()
            status_joint = server_socket_write(stsrv_socket, data)
            if status_joint != 0:
                stsrv_handle_socket_write_error(status_joint, True, 'An error occurred while sending joint status')

            data = stsrv_send_tcp_state()
            status_tcp = server_socket_write(stsrv_socket, data)
            if status_tcp != 0:
                stsrv_handle_socket_write_error(status_tcp, True, 'An error occurred while sending tcp status')

            status = status_joint + status_tcp
            wait(0.1)

        stsrv_handle_socket_write_error(status, True, 'State server:', '')
        wait(1.0)  # Wait after failure

    server_socket_close(stsrv_socket)
    tp_log('State server: Vision Controller has disconnected')


def pho_start_state_server():
    """
    Starts the State server in a separate thread
    """
    return thread_run(run_state_server, loop=True)



# PhotoneoCommon module v.1.6
# Copyright(c) 2022 Photoneo s.r.o.
# All rights reserved

# ===== GLOBAL CONSTANTS
PHO_DEBUG = False

# Port for binpicking server
#BINPICKING_SRV_PORT = 11003

# Robot brand
BRAND_ID = 'DOOSAN/1.6.0_XXXXXXXXXXX'

# This determines byteorder for sending data and representing received data.
# Native robot controller endianness is 'little' (tested using sys.byteorder)
ENDIANNESS = 'little'
BYTEORDER_FMT = {'little': '<', 'big': '>'}[ENDIANNESS]


def __auxi_get_dict_from_class_consts(c):
    """
    Helper function that returns Name Dictionary (ND) for enum-like classes
    """
    names = list(filter(lambda n: all(c.isupper() for c in n.split('_')), dir(c)))
    ids = [getattr(c, e) for e in names]
    return dict(zip(ids, names))


def get_header(payload_size, request_id):
    data = struct.pack(BYTEORDER_FMT + '5i', ord('P'), ord('H'), ord('O'), payload_size, request_id)
    return data


# Request types
class PhoRequest:
    SCAN = 1
    TRAJECTORY = 2
    INITIALIZE = 4
    CALIB_ADD_POINT = 5
    CUSTOMER = 6
    PICK_FAILED = 7
    OBJECT_POSE = 8
    CHANGE_SOLUTION = 9
    START_SOLUTION = 10
    STOP_SOLUTION = 11
    GET_RUNNING_SOLUTION = 12
    GET_AVAILABLE_SOLUTIONS = 13


# Dictionary with Request names and IDs
PhoRequestND = __auxi_get_dict_from_class_consts(PhoRequest)


# Operation types
class PhoOperationType:
    TRAJECTORY_CNT = 0
    TRAJECTORY_FINE = 1
    GRIPPER = 2
    ERROR = 3
    INFO = 4
    OBJECT_POSE = 5


# Dictionary with Operation names and IDs
PhoOperationTypeND = __auxi_get_dict_from_class_consts(PhoOperationType)


# Gripper commands
class PhoGripperCmd:
    ATTACH = 1
    DETACH = 2
    USER_1 = 3
    USER_2 = 4
    USER_3 = 5


# Dictionary with Gripper commands names and IDs
PhoGripperCmdND = __auxi_get_dict_from_class_consts(PhoGripperCmd)


# Info commands operations numbers
class PhoOperationInfo:
    TOOL_POINT_INV = 1
    GRIPPING_ID = 2
    GRIPPING_POINT_INV = 3


# Dictionary with Info commands names and IDs
PhoOperationInfoND = __auxi_get_dict_from_class_consts(PhoOperationInfo)


# Error codes: communication
class PhoCommErr:
    OK = 0
    SERVICE_ERR = 1
    UNKNOWN_REQ = 2
    COMM_FAILURE = 3
    BAD_DATA = 4
    TIMEOUT = 5


# Dictionary with communication error names and IDs
PhoCommErrND = __auxi_get_dict_from_class_consts(PhoCommErr)

PHO_COMM_ERR_STOP = True


# Error codes: Binpicking
class PhoBipiErr:
    PLANNING_FAILED = 201
    NO_PART_FOUND = 202
    NOT_INITIALIZED = 203
    EMPTY_SCENE = 218
    WRONG_BP_CONF = 255


# Dictionary with Binpicking error names and IDs
PhoBipiErrND = __auxi_get_dict_from_class_consts(PhoBipiErr)

# ===== GLOBAL VARIABLES =====

# User Error Info
pho_err_occurred = False
pho_err_code = PhoCommErr.OK

# User Info Variables
pho_tool_point_invariance = -1
pho_gripping_point_id = -1
pho_gripping_point_invariance = -1
pho_info_data = []

# Currently sent requests awaiting response
pho_requests_blocked = False  # True if there's a blocking request and cannot send another one

# Last rquest ID
pho_last_request_id = None

# Operation related variables
pho_trajectory_buffer = []  # 'list' of 'posj' joint poses for trajectory waypoints
pho_trajectory_type = []  # (bool) if trajectory on the same index si "FINE" (or "CNT")
pho_operations = []  # stores operations order from  TRAJECTORY request responses

# pho_num_of_operations = 0
pho_object_pose = None

# Calibration related variables
pho_reprojection_error = -1

# Pick allowed flag
pho_pick_allowed = False

# Bin picking speed and acceleration data
pho_speed_data = []
pho_acceleration_data = []

# solutions
pho_running_solution = -1
pho_available_solutions = []


# Auxiliary functions
def __int2ord(i):
    """
    :param i: integer
    :return: string representing ordinal number of i
    """
    if abs(i) > 3 or i == 0:
        return '{}-th'.format(i)
    else:
        return '{}-{}'.format(i, ['st', 'nd', 'rd'][i - 1])


# ===== COMMON =====
bps_client_socket = None


def deg_2_rad(deg):
    rad = []
    for d in deg:
        tmp = d2r(d)
        rad.append(round(tmp, 5))
    return tuple(rad)


def rad_2_deg(rad):
    deg = []
    for r in rad:
        tmp = r2d(r)
        deg.append(round(tmp, 5))
    return deg


def handle_socket_read_error(response, set_err_code, log=True, message1='', message2=''):
    global PHO_DEBUG, pho_err_code
    if response >= 0:
        if set_err_code: pho_err_code = PhoCommErr.BAD_DATA
        if log or PHO_DEBUG:
            tp_log(message1 + ' Did receive incorrect length of data ({}B). '.format(response) + message2)
    elif response == -1:
        if set_err_code: pho_err_code = PhoCommErr.COMM_FAILURE
        if log or PHO_DEBUG:
            tp_log(message1 + ' The client is not connected (-1). ' + message2)
    elif response == -2:
        if set_err_code: pho_err_code = PhoCommErr.COMM_FAILURE
        if log or PHO_DEBUG:
            tp_log(message1 + ' Socket.error occurred during data reception (-2). ' + message2)
    elif response == -3:
        if set_err_code: pho_err_code = PhoCommErr.TIMEOUT
        if log or PHO_DEBUG:
            tp_log(message1 + ' Timeout during data reception. Expected version data (-3). ' + message2)
    else:
        if set_err_code: pho_err_code = PhoCommErr.BAD_DATA
        if log or PHO_DEBUG:
            tp_log(message1 + ' Unknown socket reading error ({})'.format(response) + message2)


def handle_socket_write_error(status, log=True, message1='', message2='', set_pho_err=True):
    global PHO_DEBUG, pho_err_code, pho_err_occurred
    if set_pho_err:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE

    if status == -1:
        if log or PHO_DEBUG:
            tp_log(message1 + ' The client is not connected (-1). ' + message2)
    elif status == -2:
        if log or PHO_DEBUG:
            tp_log(message1 + ' Server/Client is disconnected, or socket.error occurred during a data transfer (-2). '
                   + message2)
    else:
        if log or PHO_DEBUG:
            tp_log(message1 + ' Unknown error during socket write ({}) '.format(status) + message2)


def bps_client_open_socket(server_ip):
    """
    Connect as a client to BPS server.
    """
    global bps_client_socket, BINPICKING_SRV_PORT, pho_err_occurred, pho_err_code
    try:
        bps_client_socket = client_socket_open(server_ip, BINPICKING_SRV_PORT)
        return True
    except:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE
        tp_log('Connection to Vision Controller failed.')
        return False


def bps_client_flush_socket():
    global bps_client_socket
    flag = True
    while flag:
        response, _ = client_socket_read(bps_client_socket, length=4, timeout=0.05)
        flag = response > 0


def bps_client_check_version():
    """
    Checks if the version of Binpicking on Robot controller and Vision controller match
    :return: True if match, False if not or if an error occurred
    """
    global bps_client_socket, pho_err_occurred, BRAND_ID

    # Send version info to Vision controller
    data = struct.pack('24s', BRAND_ID.encode(encoding='UTF-8'))
    status = client_socket_write(bps_client_socket, data)

    if status != 0:
        handle_socket_write_error(status, False, 'Unable to send the Robot ID to the Vision Controller.')
        return False

    return True


def pho_wait_for_server(server_ip):
    """
    Function to establish connection to the Vision Controller
    :param server_ip: string with IPv4 address of Vision Controller (Robot interface)
    :return: True on success, False otherwise
    """
    global bps_client_socket, pho_err_occurred, pho_err_code

    connected = False

    # First try to close opened socket in case there was an error
    if bps_client_socket:
        try:
            client_socket_close(bps_client_socket)
        except:
            pass

    # Try to connect (there's no timeout possible, only exceptions)
    tp_log('Connecting to Vision Controller...')
    try:
        connected = bps_client_open_socket(server_ip)
    except:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE
        return False

    if connected:
        # Reset errors since the connection succeeded
        pho_err_occurred = False
        pho_err_code = PhoCommErr.OK

        # Check versions
        if bps_client_check_version():
            tp_log('Connection to Vision Controller established. IP: {}'.format(server_ip))
            return True


def bps_client_send_request(request_id, vs_id, data=b''):
    """
    Appends data to standard header and sends request to Vision Controller
    :param request_id: Request ID. Valid values are defined in PhoRequest class
    :param vs_id: Vision System ID
    :param data: data in bytes to be send after header, i.e. 'PHO', req_id, vs_id
    :return: True if the request was successfully sent, False otherwise
    """
    global bps_client_socket, PHO_HEADER, BYTEORDER_FMT, PHO_DEBUG, PhoRequestND, pho_requests_blocked, \
        pho_err_occurred, pho_err_code, pho_last_request_id, pho_tool_point_invariance, pho_gripping_point_id, \
        pho_gripping_point_invariance

    if request_id not in PhoRequestND.keys():
        pho_err_occurred = True
        tp_log('Unknown request id: {}'.format(request_id))
        return False

    # Check socket status
    socket_status = client_socket_state(bps_client_socket)
    if socket_status != 1:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE
        return False

    bps_client_flush_socket()

    # Check if any unresolved request is blocking sending of this one
    if pho_requests_blocked:
        tp_popup('The "{}" request is blocked by the previous one!'.format(PhoRequestND[request_id]))
        pho_err_occurred = True
        return False

    # Requests related witch solutions operations, add calibration point
    if (9 <= request_id <= 13) or request_id == 5:
        pass
    else:
        data = vs_id.to_bytes(4, ENDIANNESS) + data

    data_size = len(data) // 4

    msg = get_header(payload_size=data_size, request_id=request_id)
    msg += data

    if PHO_DEBUG:
        tp_log('Sending Binpicking request: "{}"'.format(PhoRequestND[request_id]))

    status = client_socket_write(bps_client_socket, msg)
    if status != 0:
        msg = 'Binpicking client: Sending "{}" request has failed'.format(PhoRequestND[request_id])
        handle_socket_write_error(status, False, msg)
        return False
    else:
        # Sending the request succeeded => set blocking flag
        pho_last_request_id = request_id
        pho_requests_blocked = True
        return True


def bps_client_handle_operation_error(read_bytes, request_id):
    global bps_client_socket, pho_err_occurred, pho_err_code, PhoRequestND
    response, op_data = client_socket_read(bps_client_socket, length=read_bytes, timeout=-1)

    if response != read_bytes:
        pho_err_occurred = True
        msg = 'Error while reading operation data from request "{}".'.format(PhoRequestND[request_id])
        handle_socket_read_error(response, True, False, msg)

    (pho_err_code,) = struct.unpack(BYTEORDER_FMT + 'i', op_data)

    if pho_err_code != PhoCommErr.OK:
        pho_err_occurred = True
        msg = 'Wrong BP configuration! More details in Bin Picking Studio console. ({})'.format(pho_err_code)
        tp_log(msg)


def bps_client_handle_operation_trajectory(waypoints_count, fine, wait_time=0.5):
    """
    Receives one trajectory from BinPicking server (corresponding to 1 subheader)
    :param waypoints_count: or data array count; defined in the received header
    :param fine: (bool) defined by the received operation type
    :param wait_time: time to wait for receiving a single waypoint
    """
    global bps_client_socket, PHO_DEBUG, pho_err_occurred, pho_err_code, pho_trajectory_buffer, pho_trajectory_type

    WAYPOINT_MSG_SIZE = 32

    # Get index for saving waypoints to 'pho_trajectory_buffer' list
    trajectory_id = len(pho_trajectory_buffer)

    # Append list with 'fine' flag + waypoints placeholder for a new trajectory
    pho_trajectory_buffer.append([posj()] * waypoints_count)
    pho_trajectory_type.append(fine)

    for wp_id in range(waypoints_count):
        response, wp_data = client_socket_read(bps_client_socket, length=WAYPOINT_MSG_SIZE, timeout=wait_time)
        if response != WAYPOINT_MSG_SIZE:
            if PHO_DEBUG:
                msg = 'Error receiving {} waypoint.'.format(__int2ord(wp_id + 1))
                handle_socket_read_error(response, False, False, msg)
            pho_err_occurred = True
            pho_err_code = PhoCommErr.BAD_DATA
            return False

        unpacked_data = struct.unpack(BYTEORDER_FMT + 'i7f', wp_data)
        wp_msg_id = unpacked_data[0]
        joints = posj(*unpacked_data[1:7])
        joint_msg_crc = unpacked_data[7]
        joint_crc = sum(joints)

        # Check if the data are valid
        if (abs(joint_msg_crc - joint_crc) < 0.001) and (wp_msg_id == wp_id + 1):
            # Add waypoint to current trajectory data
            joints_deg = rad_2_deg(joints)
            pho_trajectory_buffer[trajectory_id][wp_id] = posj(joints_deg)
        else:
            msg = ''
            if wp_msg_id != wp_id + 1:
                msg += 'Incorrect waypoint ID received ({}, expected: {})! '.format(wp_msg_id, wp_id + 1)
            if not (abs(joint_msg_crc - joint_crc) < 0.001):
                msg += 'Joints checksum is incorrect (actual: {}, expected: {})!'.format(joint_crc, joint_msg_crc)

            tp_popup('Error while receiving trajectory! ' + msg, DR_PM_ALARM, 1)
            pho_err_occurred = True
            pho_err_code = PhoCommErr.BAD_DATA
            return False
    return True


def bps_client_handle_operation_other(request_id, wait_time=0.5):
    """
    Receives the data corresponding to subheaders which are followed by data consisting of a single integer
    :return: received int on success, None on failure
    """
    global bps_client_socket, pho_err_occurred, pho_err_code, PhoRequestND

    MSG_BYTES = 4
    response, op_data = client_socket_read(bps_client_socket, length=MSG_BYTES, timeout=wait_time)

    if response != MSG_BYTES:
        pho_err_occurred = True
        msg = 'Error while reading operation data from request "{}".'.format(PhoRequestND[request_id])
        handle_socket_read_error(response, True, False, msg)
        return None

    (msg,) = struct.unpack(BYTEORDER_FMT + 'i', op_data)
    return msg


def bps_client_handle_received_available_solutions(solutions_count, wait_time=0.5):
    """
    Received ids of available solutions
    :return: List of ids of available solutions
    """
    global bps_client_socket, pho_err_occurred, pho_err_code, PhoRequestND

    MSG_BYETS = 4
    available_solutions_list = []

    for solution in range(solutions_count):
        response, solution_id = client_socket_read(bps_client_socket, length=MSG_BYETS, timeout=wait_time)
        if response != MSG_BYETS:
            pho_err_occurred = True
            msg = 'Error while reading available solutions "{}".'.format(PhoRequestND[13])
            handle_socket_read_error(response, True, False, msg)
            return None

        (msg,) = struct.unpack(BYTEORDER_FMT + 'i', solution_id)
        available_solutions_list.append(msg)

    return available_solutions_list


def bps_client_handle_operation_object_pose(request_id, wait_time=0.5):
    """
    Receives the data corresponding to subheader with operation type PhoOperationType.OBJECT_POSE
    Check 'posx()' documentation for rotation explanation
    :return: 'posx' object on success, None on failure
    """
    global bps_client_socket, pho_err_occurred, pho_err_code, PhoRequestND
    MSG_BYTES = 24  # x, y, z, Rz, Ry, Rz'
    response, op_data = client_socket_read(bps_client_socket, length=MSG_BYTES, timeout=wait_time)

    if response != MSG_BYTES:
        pho_err_occurred = True
        msg = 'Error while reading "pose" operation data from request "{}".'.format(PhoRequestND[request_id])
        handle_socket_read_error(response, True, False, msg)
        return None

    x, y, z, rz, ry, rz2 = struct.unpack(BYTEORDER_FMT + '6f', op_data)
    rot_deg = rad_2_deg([rz, ry, rz2])
    return posx(x, y, z, rot_deg[0], rot_deg[1], rot_deg[2])


def bps_client_recv_response(request_id, wait_time):
    """
    Receives responses to previously sent requests to BPS server.
    :param request_id: (int) ID of sent request, for which a response is to be received.
    :param wait_time: (float) Time to wait for response in seconds
    :return: True if no error occurred, False otherwise
    """
    global BYTEORDER_FMT, bps_client_socket, pho_err_code, pho_err_occurred, pho_requests_blocked, \
        PhoRequestND, PhoOperationTypeND, PhoGripperCmdND, PhoOperationInfoND, pho_info_data, \
        pho_tool_point_invariance, pho_gripping_point_id, pho_gripping_point_invariance, \
        pho_object_pose, pho_reprojection_error, pho_last_request_id, pho_running_solution, \
        pho_available_solutions

    # Check if correct request was sent preceding this receive call
    if request_id != pho_last_request_id:
        pho_err_occurred = True
        if pho_last_request_id is None:
            tp_popup('Program flow error. Missing request call preceding the current response call.', DR_PM_ALARM, 1)
        else:
            tp_popup('Program flow error. Incorrect request call preceding the current response call. '
                   'Expected "{}"'.format(PhoRequestND.get(request_id, request_id)), DR_PM_ALARM, 1)
        return False

    if request_id not in PhoRequestND.keys():
        pho_err_occurred = True
        tp_log('Unknown request id: {}'.format(request_id))
        return False

    HEADER_SIZE = 12
    SUB_HEADER_SIZE = 12

    # Check socket status
    socket_status = client_socket_state(bps_client_socket)
    if socket_status != 1:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE
        return not pho_err_occurred

    # Clear flags from previous request
    pho_err_occurred = False
    pho_err_code = PhoCommErr.OK
    pho_last_request_id = None

    # Wait for message header
    response, data = client_socket_read(bps_client_socket, length=HEADER_SIZE, timeout=wait_time)

    if response != HEADER_SIZE:
        pho_err_occurred = True
        handle_socket_read_error(response, True, True, 'Binpicking client.', 'Expected header data.')
        return not pho_err_occurred

    recv_req_id, n_subheaders, _ = struct.unpack(BYTEORDER_FMT + '3i', data)

    # Check if response matches the request type
    if recv_req_id != request_id:
        tp_log('ERROR: Request was "{}" ({}). Received "{}" ({})'.format(
            PhoRequestND[request_id], request_id, PhoRequestND.get(recv_req_id, '?'), recv_req_id))

        pho_err_occurred = True
        pho_err_code = PhoCommErr.BAD_DATA
        bps_client_flush_socket()

        return not pho_err_occurred

    if PHO_DEBUG:
        tp_log('Response to "{}" request: header: {} subheaders'.format(PhoRequestND[request_id], n_subheaders))

    # Start reading & processing subheaders
    for i_sub in range(n_subheaders):

        # Read subheader
        response, data = client_socket_read(bps_client_socket, length=SUB_HEADER_SIZE, timeout=wait_time)

        if response != SUB_HEADER_SIZE:
            pho_err_occurred = True
            handle_socket_read_error(response, True, True, 'Binpicking client.',
                                     'Expected {} sub-header data ({}B).'.format(__int2ord(i_sub), SUB_HEADER_SIZE))
            break

        operation_type, operation_number, data_array_count = struct.unpack(BYTEORDER_FMT + '3i', data)

        if PHO_DEBUG:
            tp_log('Read subheader {}. Operation type/number/data_array_count: {}/{}/{}'.format(
                i_sub,
                PhoOperationTypeND.get(operation_type, str(operation_type)),
                operation_number,
                data_array_count
            ))

        if request_id == PhoRequest.TRAJECTORY:
            pho_operations.append(operation_type)

        if operation_type == PhoOperationType.TRAJECTORY_CNT:
            bps_client_handle_operation_trajectory(data_array_count, False, wait_time)
        elif operation_type == PhoOperationType.TRAJECTORY_FINE:
            bps_client_handle_operation_trajectory(data_array_count, True, wait_time)
        elif operation_type == PhoOperationType.GRIPPER:
            gripper_op = bps_client_handle_operation_other(request_id)
            if PHO_DEBUG:
                tp_log('Received gripper operation: {} (operation number: {})'.format(gripper_op, operation_number))
        elif operation_type == PhoOperationType.ERROR:
            bps_client_handle_operation_error(data_array_count * 4, request_id)
            if pho_err_occurred:
                break
        elif operation_type == PhoOperationType.INFO:
            if recv_req_id == PhoRequest.GET_RUNNING_SOLUTION:
                pho_running_solution = bps_client_handle_operation_other(request_id)
                if PHO_DEBUG:
                    tp_log('Received running solution: {}'.format(pho_running_solution))
            elif recv_req_id == PhoRequest.GET_AVAILABLE_SOLUTIONS:
                pho_available_solutions = bps_client_handle_received_available_solutions(data_array_count)
                tp_log('available solutions: {}'.format(pho_available_solutions))
                pass
            else:
                pho_info = bps_client_handle_operation_other(request_id)
                pass
                if operation_number == PhoOperationInfo.TOOL_POINT_INV:
                    pho_tool_point_invariance = pho_info
                    if PHO_DEBUG:
                        tp_log('Received Info operation: tool_point_invariance: {}'.format(pho_info))
                elif operation_number == PhoOperationInfo.GRIPPING_ID:
                    pho_gripping_point_id = pho_info
                    if PHO_DEBUG:
                        tp_log('Received Info operation: gripping_point_id: {}'.format(pho_info))
                elif operation_number == PhoOperationInfo.GRIPPING_POINT_INV:
                    pho_gripping_point_invariance = pho_info
                    if PHO_DEBUG:
                        tp_log('Received Info operation: gripping_point_invariance: {}'.format(pho_info))
                else:
                    pho_info_data.append(pho_info)
                    if PHO_DEBUG:
                        tp_log('Received Info: {}'.format(pho_info))

        elif operation_type == PhoOperationType.OBJECT_POSE:
            pho_object_pose = bps_client_handle_operation_object_pose(request_id)
        else:
            msg = 'Response to "{}" request: Unknown type of operation received: {}'.format(
                PhoRequestND[request_id],
                PhoOperationTypeND.get(operation_type, )
            )
            tp_popup(msg, DR_PM_MESSAGE, 0)
            pho_err_occurred = True
            pho_err_code = PhoCommErr.UNKNOWN
            break
    return not pho_err_occurred


def pho_request_init(pho_start_bin_picking_pose, pho_end_bin_picking_pose, vision_system_id, wait_time=-1):
    """
    Request to initialize a bin picking session
    Sends start and end poses to Binpicking server.
    :param pho_start_bin_picking_pose: start pose. (posj) object or iterable with joint 1 - 6 states [deg]
    :param pho_end_bin_picking_pose: end pose. (posj) object or iterable with joint 1 - 6 states [deg]
    :param vision_system_id: (int) ID of the vision system
    :param wait_time: time to wait for response [sec]
    """
    global BYTEORDER_FMT, pho_requests_blocked

    start_pose_rad = deg_2_rad(pho_start_bin_picking_pose)
    end_pose_rad = deg_2_rad(pho_end_bin_picking_pose)
    joints_deg = [j_rad for j_rad in start_pose_rad] + [j_rad for j_rad in end_pose_rad]

    data = struct.pack(BYTEORDER_FMT + '12f', *joints_deg)

    if bps_client_send_request(PhoRequest.INITIALIZE, vision_system_id, data):
        bps_client_recv_response(PhoRequest.INITIALIZE, wait_time)
        pho_requests_blocked = False


def pho_request_scan(vision_system_id):
    """
    Sends a scan request
    """
    global PHO_DEBUG

    if PHO_DEBUG:
        tp_log('Binpicking client: Sending SCAN request for VS {}...'.format(vision_system_id))

    bps_client_send_request(PhoRequest.SCAN, vision_system_id)


def pho_request_trajectory(vision_system_id):
    """
    Sends request to receive a new trajectory
    """
    global pho_pick_allowed, pho_trajectory_buffer, pho_operations

    # Clear buffers from the previous trajectories
    pho_trajectory_buffer = []
    pho_operations = []

    bps_client_send_request(PhoRequest.TRAJECTORY, vision_system_id)
    pho_pick_allowed = False


def pho_request_calib_add_point():
    """
    Request to add point to calibration. Function is waiting for a confirmation from Vision Controller
    """
    global pho_requests_blocked
    if bps_client_send_request(PhoRequest.CALIB_ADD_POINT, 0):
        bps_client_recv_response(PhoRequest.CALIB_ADD_POINT, -1)
        pho_requests_blocked = False


def pho_request_send_pick_failed(vision_system_id):
    """
    Request to send pick failed
    """
    global pho_requests_blocked
    if bps_client_send_request(PhoRequest.PICK_FAILED, vision_system_id):
        bps_client_recv_response(PhoRequest.PICK_FAILED, -1)
        pho_requests_blocked = False


def pho_request_change_solution(required_solution_id):
    """
    Request for solution change
    """
    global pho_requests_blocked, BYTEORDER_FMT

    data = struct.pack(BYTEORDER_FMT + 'i', required_solution_id)

    if bps_client_send_request(PhoRequest.CHANGE_SOLUTION, 0, data):
        bps_client_recv_response(PhoRequest.CHANGE_SOLUTION, -1)
        pho_requests_blocked = False


def pho_request_start_solution(required_solution_id):
    """
    Request for start solution
    """
    global pho_requests_blocked, BYTEORDER_FMT

    data = struct.pack(BYTEORDER_FMT + 'i', required_solution_id)

    if bps_client_send_request(PhoRequest.START_SOLUTION, 0, data):
        bps_client_recv_response(PhoRequest.START_SOLUTION, -1)
        pho_requests_blocked = False


def pho_request_stop_solution():
    """
    Request for stop solution
    """
    global pho_requests_blocked, BYTEORDER_FMT

    if bps_client_send_request(PhoRequest.STOP_SOLUTION, 0):
        bps_client_recv_response(PhoRequest.STOP_SOLUTION, -1)
        pho_requests_blocked = False


def pho_request_get_running_solution():
    """
    Request for get running solution
    """
    global pho_requests_blocked, BYTEORDER_FMT

    if bps_client_send_request(PhoRequest.GET_RUNNING_SOLUTION, 0):
        bps_client_recv_response(PhoRequest.GET_RUNNING_SOLUTION, -1)
        pho_requests_blocked = False


def pho_request_get_available_solutions():
    """
    Request for get available solutions
    """
    global pho_requests_blocked, BYTEORDER_FMT

    if bps_client_send_request(PhoRequest.GET_AVAILABLE_SOLUTIONS, 0):
        bps_client_recv_response(PhoRequest.GET_AVAILABLE_SOLUTIONS, -1)
        pho_requests_blocked = False


def pho_request_object_pose(vision_system_id):
    """
    Request for an object pose
    """
    global pho_requests_blocked
    if bps_client_send_request(PhoRequest.OBJECT_POSE, vision_system_id):
        bps_client_recv_response(PhoRequest.OBJECT_POSE, -1)
        pho_requests_blocked = False


def pho_other_req(vision_system_id, data):
    """
    Request to send other customer data
    :param vision_system_id: (int) ID of the Vision System
    :param data: (bytes) data to be sent
    """
    global pho_requests_blocked, pho_err_occurred, pho_err_code

    if type(data) is not bytes:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.BAD_DATA
        tp_log('Error: incorrect data in customer request! Expecting bytes, got "{}".'.format(type(data)))
        return

    bps_client_send_request(PhoRequest.CUSTOMER, vision_system_id, data)
    pho_requests_blocked = False  # Not expecting any response


# ===== RESPONSES =====
def pho_wait_for_scan_completion(wait_time=-1):
    """
    Function to wait for confirmation message from the Vision Controller that the scanning has finished
    """
    global PHO_DEBUG, pho_err_occurred, pho_err_code, pho_requests_blocked

    if pho_err_occurred:
        if pho_err_code in [PhoCommErr.TIMEOUT, PhoCommErr.BAD_DATA, PhoCommErr.COMM_FAILURE]:
            return

    bps_client_recv_response(PhoRequest.SCAN, wait_time)
    pho_requests_blocked = False


def pho_receive_trajectory(wait_time=-1):
    """
    Receives a new trajectory from the Vision Controller after requesting it
    """
    global pho_pick_allowed, pho_requests_blocked, pho_err_occurred, pho_err_code

    if pho_err_occurred:
        if pho_err_code in [PhoCommErr.TIMEOUT, PhoCommErr.BAD_DATA, PhoCommErr.COMM_FAILURE]:
            return

    bps_client_recv_response(PhoRequest.TRAJECTORY, wait_time)
    pho_requests_blocked = False
    pho_pick_allowed = True





# CustomerDefinitions module v.1.6
# Copyright(c) 2022 Photoneo s.r.o.
# All rights reserved

# Implement gripper commands and adapt binpicking sequences to meet your application requirements

# -----------------------------------------------------------------------------
# -------------------- GRIPPER COMMANDS TO BE IMPLEMENTED ---------------------
# -----------------------------------------------------------------------------

# Implement command to attach part to gripper here
def gripper_attach():
    pass


# Implement command to detach part from gripper here
def gripper_detach():
    pass


# Implement your custom gripper command here
def gripper_user_1():
    pass


# Implement your custom gripper command here
def gripper_user_2():
    pass


# Implement your custom gripper command here
def gripper_user_3():
    pass


# -----------------------------------------------------------------------------
# ------------------------ BIN PICKING SPEED SETTINGS -------------------------
# -----------------------------------------------------------------------------

def binpicking_settings():
    """
    Set the joint speeds and accelerations for gripping path stages defined in Binpicking solution.
    Values are in [degrees per second] / [degrees per second^2].
    For each trajectory is possible to use a float value, which sets the same speed for each joint
    or a list of 6 floats, i.e. speed for joint 1 ... 6. [j1, j2, j3, j4, j5, j6]
    Acceleration settings are analogous to the speed settings.
    """
    global pho_speed_data, pho_acceleration_data

    # Init/reset the global settings
    pho_speed_data = []
    pho_acceleration_data = []

    # Maximal joint velocities for Doosan M1013 (j1, ...,j6) [degrees per second]
    # Adjust the joint velocities as appropriate for your application. Note that real velocities may be lower
    # than values defined here - depending on the distances of trajectory waypoints
    max_velocity = [120.0, 120.0, 180.0, 225.0, 225.0, 225.0]

    # Joint accelerations for (j1, ...,j6) [degrees per second^2]
    # Adjust the joint accelerations as appropriate for your application. Note that real accelerations may be lower
    # than values defined here - depending on the distances of trajectory waypoints
    acceleration = [400] * 6

    # 1st trajectory speed (Approach trajectory by default)
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 2nd trajectory speed (Grasp trajectory by default)
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 3rd trajectory speed (Deapproach trajectory by default)
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 4th trajectory speed (End trajectory by default)
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 5th trajectory speed
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 6th trajectory speed
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)


# -----------------------------------------------------------------------------
# ------------------------BIN PICKING IMPLEMENTATIONS -------------------------
# -----------------------------------------------------------------------------


def pho_bin_picking():
    """
    DO NOT EDIT!!!
    Standard bin picking implementation
    Allows for an execution of various number of operations. Joint velocities and accelerations
    are defined in 'binpicking_settings()'
    """
    global PHO_DEBUG, pho_trajectory_buffer, pho_operations, pho_speed_data, pho_acceleration_data, \
        pho_err_occurred, pho_pick_allowed

    trajectory_id = 0
    gripper_cmd_id = 1  # PhoGripperCmd.ATTACH

    # Set velocities and accelerations
    binpicking_settings()

    # Make sure that no errors occurred, otherwise return from the function
    if not pho_err_occurred:
        if not pho_pick_allowed:
            msg = 'Program flow error! Pick rejected. Possible causes: Repeated call: pho_bin_picking() OR '
            msg += 'Missing call: pho_receive_trajectory()'
            tp_popup(msg, DR_PM_ALARM, 1)
        else:
            # Execute received operations
            n_ops = len(pho_operations)
            for i, operation in enumerate(pho_operations):
                if PHO_DEBUG:
                    tp_log(
                        'operation {} of {}: {}({})...'.format(i, n_ops, PhoOperationTypeND.get(operation, '?'), operation))

                if operation in [PhoOperationType.TRAJECTORY_FINE, PhoOperationType.TRAJECTORY_CNT]:
                    velocity = pho_speed_data[trajectory_id]
                    acceleration = pho_acceleration_data[trajectory_id]

                    # Execute the movement (the robot have to start in the waypoint at index 0)
                    movesj(pho_trajectory_buffer[trajectory_id][1:], v=velocity, a=acceleration)
                    trajectory_id += 1

                elif operation == PhoOperationType.GRIPPER:
                    execute_gripper(gripper_cmd_id)
                    gripper_cmd_id += 1

    # Reset pick allowed flag
    pho_pick_allowed = False


def pho_execute_trajectory(trajectory_id, velocity=-1, acceleration=-1):
    """
    Executes a single trajectory
    :param trajectory_id: ID of the trajectory to executeut
    :param velocity: positive float value or a list of 6 such values of joint velocities [deg/s] *
    :param acceleration: positive float value or a list of 6 such values of joint velocities [deg/s^2] *
    * otherwise global settings will be used from 'pho_speed_data', 'pho_acceleration_data'
    """
    global PHO_DEBUG, pho_trajectory_buffer, pho_operations, pho_speed_data, pho_acceleration_data
    use_velocity = 0
    use_acceleration = 0

    if PHO_DEBUG:
        tp_log('Executing trajectory {}'.format(trajectory_id))

    # Check if requested trajectory ID exists, exit if not
    if 0 <= trajectory_id < len(pho_trajectory_buffer):
        trajectory_waypoints = pho_trajectory_buffer[trajectory_id]

        # Determine which velocity will be used
        if hasattr(velocity, '__len__'):
            if len(velocity) == 6:
                use_velocity = velocity
        elif velocity > 0:
            use_velocity = velocity
        else:
            use_velocity = pho_speed_data[trajectory_id]

        # Determine which acceleration will be used
        if hasattr(acceleration, '__len__'):
            if len(acceleration) == 6:
                use_acceleration = acceleration
        elif acceleration > 0:
            use_acceleration = acceleration
        else:
            use_acceleration = pho_acceleration_data[trajectory_id]

        # Execute the movement (the robot have to start in the waypoint at index 0)
        movesj(trajectory_waypoints[1:], v=use_velocity, a=use_acceleration)


def execute_gripper(gripper_cmd_id):
    """
    Calls user defined code for executing a gripper command
    :param gripper_cmd_id: constant defined in PhoGripperCmd
    """
    if gripper_cmd_id == PhoGripperCmd.ATTACH:
        gripper_attach()
    elif gripper_cmd_id == PhoGripperCmd.DETACH:
        gripper_detach()
    elif gripper_cmd_id == PhoGripperCmd.USER_1:
        gripper_user_1()
    elif gripper_cmd_id == PhoGripperCmd.USER_2:
        gripper_user_2()
    elif gripper_cmd_id == PhoGripperCmd.USER_3:
        gripper_user_3()



#vel = 50
#acc = 50
#home_pose = posj(0,0,90,0,90,0)
#calibration_positions = [
#    posj([14.882, 35.244, 69.174, -18.363, 112.904, -138.364]),
#    posj([28.295, -0.959, 117.902, -47.724, 56.676, -74.845] ),
#    posj([-33.701, 1.664, 115.257, 47.265, 60.254, -128.953] ),
#    posj([-18.206, 36.768, 66.621, 16.316, 114.844, -64.686] ),
#    posj([5.675, 12.069, 84.905, 29.343, 51.126, 1.786]      ),
#    posj([6.252, 6.326, 91.682, 31.054, 109.944, 41.445]     ),
#    posj([-11.246, 7.104, 90.807, -33.175, 107.386, 74.082]  ),
#    posj([-10.215, 12.782, 84.025, -26.477, 49.166, 112.925] ),
#    posj([-2.425, 9.516, 92.001, 0.004, 78.473, -2.436]      )
#]
#BINPICKING_SRV_IP = '192.168.137.10'
#BINPICKING_SRV_PORT = 11003
#STATE_SRV_PORT = 11004
def _CalibrationButton():
    global pho_err_code, pho_err_occurred, BINPICKING_SRV_IP,  home_pose, vel, acc
    pho_start_state_server()
    if not pho_wait_for_server (BINPICKING_SRV_IP):
        exit()
    movej(home_pose,vel=vel, acc=acc)
    wait(3)
    
    for calibration_pose in calibration_positions:
        # Move robot to one of the calibration position
        movej(calibration_pose, vel=vel, acc=acc)

        # Request for add calibration point
        pho_request_calib_add_point()
        
        # Check if the error occurred. If there is error the error code is logged to robot logs and the calibration is stopped
        
        if pho_err_occurred:
            #tp_popup(str(pho_err_code))
            #movej(home_pose, vel=vel, acc=acc)
            tp_log('An error has occurred when calibration point was added. The error code is: {} '.format(pho_err_code))
            wait(2)
            #break
            exit()

#################### main ####################
# calibration button
_CalibrationButton()


`

export const DRL_Validation_run = `
# StateServer module v.1.6
# Copyright(c) 2022 Photoneo s.r.o.
# All rights reserved

# -----------------------------------------------------------------------------
# --------------------------- PHOTONEO STATE SERVER ---------------------------
# -----------------------------------------------------------------------------

import struct

# Default port of state server
#STATE_SRV_PORT = 11004


JOINT_STATE_MSG_ID = 1
TOOL_POSE_MSG_ID = 2

# This determines byteorder for sending data and representing received data.
# Native robot controller endianness is 'little' (tested using sys.byteorder)
ENDIANNESS = 'little'
BYTEORDER_FMT = {'little': '<', 'big': '>'}[ENDIANNESS]

JOINTS_STATE_FMT = '6f'
JOINTS_STATE_BYTES = struct.calcsize(JOINTS_STATE_FMT)

TOOL0_POSE_FMT = '6f'
TOOL0_POSE_BYTES = struct.calcsize(TOOL0_POSE_FMT)

stsrv_socket = None

PHO_DEBUG_STSRV = False
# Robot brand
BRAND_ID = 'DOOSAN/1.6.0_XXXXXXXXXXX'

def get_header(payload_size, request_id):
    data = struct.pack(BYTEORDER_FMT + '5i', ord('P'), ord('H'), ord('O'), payload_size, request_id)
    return data
def stsrv_handle_socket_write_error(status, log=True, message1='', message2=''):
    global PHO_DEBUG_STSRV

    if status == -1:
        if log or PHO_DEBUG_STSRV:
            tp_log(message1 + ' The client is not connected (-1). ' + message2)
    elif status == -2:
        if log or PHO_DEBUG_STSRV:
            tp_log(message1 + ' Server/Client is disconnected, or socket.error occurred during a data transfer (-2). '
                   + message2)
    else:
        if log or PHO_DEBUG_STSRV:
            tp_log(message1 + ' Unknown error during socket write ({}) '.format(status) + message2)


def get_tool0_pose():
    """
    Returns the current tool0
    position in robot (base) space in [mm]
    and orientation as Euler angles ZYZ [degrees]
    """
    return get_current_tool_flange_posx(DR_BASE)


def get_tool0_pose_as_bytes():
    global TOOL0_POSE_FMT, BYTEORDER_FMT
    pose = get_tool0_pose()
    data = struct.pack(BYTEORDER_FMT + TOOL0_POSE_FMT, *pose)
    return data


def get_joints_state_as_bytes():
    """
    Gets current joint states in degrees
    and converts the 6 floats (j1, ..j6) to bytes
    """
    global JOINTS_STATE_FMT, BYTEORDER_FMT
    joints_deg = get_current_posj()
    return struct.pack(BYTEORDER_FMT + JOINTS_STATE_FMT, *joints_deg)


def stsrv_open_socket():
    global STATE_SRV_PORT, stsrv_socket
    stsrv_socket = server_socket_open(STATE_SRV_PORT)


def stsrv_send_joints_state():
    global stsrv_socket, JOINT_STATE_MSG_ID
    data = get_header(payload_size=6, request_id=JOINT_STATE_MSG_ID)
    data += get_joints_state_as_bytes()
    return data


def stsrv_send_tcp_state():
    global stsrv_socket, TOOL_POSE_MSG_ID
    data = get_header(payload_size=6, request_id=TOOL_POSE_MSG_ID)
    data += get_tool0_pose_as_bytes()
    return data


def stsrv_check_version():
    global stsrv_socket, BRAND_ID

    data = struct.pack('24s', BRAND_ID.encode(encoding='UTF-8'))
    status = server_socket_write(stsrv_socket, data)

    if status != 0:
        stsrv_handle_socket_write_error(status, True, 'Unable to send the Robot ID to the Vision Controller', '')
        return False

    return True


def run_state_server():
    global stsrv_socket, PHO_DEBUG_STSRV
    global state_server_flag

    tp_log('State server: waiting for a new connection')
    stsrv_open_socket()
    if stsrv_check_version():
        status = 0
        while status == 0:
            state_server_flag = True
            data = stsrv_send_joints_state()
            status_joint = server_socket_write(stsrv_socket, data)
            if status_joint != 0:
                stsrv_handle_socket_write_error(status_joint, True, 'An error occurred while sending joint status')

            data = stsrv_send_tcp_state()
            status_tcp = server_socket_write(stsrv_socket, data)
            if status_tcp != 0:
                stsrv_handle_socket_write_error(status_tcp, True, 'An error occurred while sending tcp status')

            status = status_joint + status_tcp
            wait(0.1)
        state_server_flag = False
        stsrv_handle_socket_write_error(status, True, 'State server:', '')
        wait(1.0)  # Wait after failure

    server_socket_close(stsrv_socket)
    tp_log('State server: Vision Controller has disconnected')


def pho_start_state_server():
    """
    Starts the State server in a separate thread
    """
    return thread_run(run_state_server, loop=True)



# PhotoneoCommon module v.1.6
# Copyright(c) 2022 Photoneo s.r.o.
# All rights reserved

# ===== GLOBAL CONSTANTS
PHO_DEBUG = False

# Port for binpicking server
#BINPICKING_SRV_PORT = 11003

# Robot brand
BRAND_ID = 'DOOSAN/1.6.0_XXXXXXXXXXX'

# This determines byteorder for sending data and representing received data.
# Native robot controller endianness is 'little' (tested using sys.byteorder)
ENDIANNESS = 'little'
BYTEORDER_FMT = {'little': '<', 'big': '>'}[ENDIANNESS]


def __auxi_get_dict_from_class_consts(c):
    """
    Helper function that returns Name Dictionary (ND) for enum-like classes
    """
    names = list(filter(lambda n: all(c.isupper() for c in n.split('_')), dir(c)))
    ids = [getattr(c, e) for e in names]
    return dict(zip(ids, names))


def get_header(payload_size, request_id):
    data = struct.pack(BYTEORDER_FMT + '5i', ord('P'), ord('H'), ord('O'), payload_size, request_id)
    return data


# Request types
class PhoRequest:
    SCAN = 1
    TRAJECTORY = 2
    INITIALIZE = 4
    CALIB_ADD_POINT = 5
    CUSTOMER = 6
    PICK_FAILED = 7
    OBJECT_POSE = 8
    CHANGE_SOLUTION = 9
    START_SOLUTION = 10
    STOP_SOLUTION = 11
    GET_RUNNING_SOLUTION = 12
    GET_AVAILABLE_SOLUTIONS = 13


# Dictionary with Request names and IDs
PhoRequestND = __auxi_get_dict_from_class_consts(PhoRequest)


# Operation types
class PhoOperationType:
    TRAJECTORY_CNT = 0
    TRAJECTORY_FINE = 1
    GRIPPER = 2
    ERROR = 3
    INFO = 4
    OBJECT_POSE = 5


# Dictionary with Operation names and IDs
PhoOperationTypeND = __auxi_get_dict_from_class_consts(PhoOperationType)


# Gripper commands
class PhoGripperCmd:
    ATTACH = 1
    DETACH = 2
    USER_1 = 3
    USER_2 = 4
    USER_3 = 5


# Dictionary with Gripper commands names and IDs
PhoGripperCmdND = __auxi_get_dict_from_class_consts(PhoGripperCmd)


# Info commands operations numbers
class PhoOperationInfo:
    TOOL_POINT_INV = 1
    GRIPPING_ID = 2
    GRIPPING_POINT_INV = 3


# Dictionary with Info commands names and IDs
PhoOperationInfoND = __auxi_get_dict_from_class_consts(PhoOperationInfo)


# Error codes: communication
class PhoCommErr:
    OK = 0
    SERVICE_ERR = 1
    UNKNOWN_REQ = 2
    COMM_FAILURE = 3
    BAD_DATA = 4
    TIMEOUT = 5


# Dictionary with communication error names and IDs
PhoCommErrND = __auxi_get_dict_from_class_consts(PhoCommErr)

PHO_COMM_ERR_STOP = True


# Error codes: Binpicking
class PhoBipiErr:
    PLANNING_FAILED = 201
    NO_PART_FOUND = 202
    NOT_INITIALIZED = 203
    EMPTY_SCENE = 218
    WRONG_BP_CONF = 255


# Dictionary with Binpicking error names and IDs
PhoBipiErrND = __auxi_get_dict_from_class_consts(PhoBipiErr)

# ===== GLOBAL VARIABLES =====

# User Error Info
pho_err_occurred = False
pho_err_code = PhoCommErr.OK

# User Info Variables
pho_tool_point_invariance = -1
pho_gripping_point_id = -1
pho_gripping_point_invariance = -1
pho_info_data = []

# Currently sent requests awaiting response
pho_requests_blocked = False  # True if there's a blocking request and cannot send another one

# Last rquest ID
pho_last_request_id = None

# Operation related variables
pho_trajectory_buffer = []  # 'list' of 'posj' joint poses for trajectory waypoints
pho_trajectory_type = []  # (bool) if trajectory on the same index si "FINE" (or "CNT")
pho_operations = []  # stores operations order from  TRAJECTORY request responses

# pho_num_of_operations = 0
pho_object_pose = None

# Calibration related variables
pho_reprojection_error = -1

# Pick allowed flag
pho_pick_allowed = False

# Bin picking speed and acceleration data
pho_speed_data = []
pho_acceleration_data = []

# solutions
pho_running_solution = -1
pho_available_solutions = []


# Auxiliary functions
def __int2ord(i):
    """
    :param i: integer
    :return: string representing ordinal number of i
    """
    if abs(i) > 3 or i == 0:
        return '{}-th'.format(i)
    else:
        return '{}-{}'.format(i, ['st', 'nd', 'rd'][i - 1])


# ===== COMMON =====
bps_client_socket = None


def deg_2_rad(deg):
    rad = []
    for d in deg:
        tmp = d2r(d)
        rad.append(round(tmp, 5))
    return tuple(rad)


def rad_2_deg(rad):
    deg = []
    for r in rad:
        tmp = r2d(r)
        deg.append(round(tmp, 5))
    return deg


def handle_socket_read_error(response, set_err_code, log=True, message1='', message2=''):
    global PHO_DEBUG, pho_err_code
    if response >= 0:
        if set_err_code: pho_err_code = PhoCommErr.BAD_DATA
        if log or PHO_DEBUG:
            tp_log(message1 + ' Did receive incorrect length of data ({}B). '.format(response) + message2)
    elif response == -1:
        if set_err_code: pho_err_code = PhoCommErr.COMM_FAILURE
        if log or PHO_DEBUG:
            tp_log(message1 + ' The client is not connected (-1). ' + message2)
    elif response == -2:
        if set_err_code: pho_err_code = PhoCommErr.COMM_FAILURE
        if log or PHO_DEBUG:
            tp_log(message1 + ' Socket.error occurred during data reception (-2). ' + message2)
    elif response == -3:
        if set_err_code: pho_err_code = PhoCommErr.TIMEOUT
        if log or PHO_DEBUG:
            tp_log(message1 + ' Timeout during data reception. Expected version data (-3). ' + message2)
    else:
        if set_err_code: pho_err_code = PhoCommErr.BAD_DATA
        if log or PHO_DEBUG:
            tp_log(message1 + ' Unknown socket reading error ({})'.format(response) + message2)


def handle_socket_write_error(status, log=True, message1='', message2='', set_pho_err=True):
    global PHO_DEBUG, pho_err_code, pho_err_occurred
    if set_pho_err:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE

    if status == -1:
        if log or PHO_DEBUG:
            tp_log(message1 + ' The client is not connected (-1). ' + message2)
    elif status == -2:
        if log or PHO_DEBUG:
            tp_log(message1 + ' Server/Client is disconnected, or socket.error occurred during a data transfer (-2). '
                   + message2)
    else:
        if log or PHO_DEBUG:
            tp_log(message1 + ' Unknown error during socket write ({}) '.format(status) + message2)


def bps_client_open_socket(server_ip):
    """
    Connect as a client to BPS server.
    """
    global bps_client_socket, BINPICKING_SRV_PORT, pho_err_occurred, pho_err_code
    try:
        bps_client_socket = client_socket_open(server_ip, BINPICKING_SRV_PORT)
        return True
    except:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE
        tp_log('Connection to Vision Controller failed.')
        return False


def bps_client_flush_socket():
    global bps_client_socket
    flag = True
    while flag:
        response, _ = client_socket_read(bps_client_socket, length=4, timeout=0.05)
        flag = response > 0


def bps_client_check_version():
    """
    Checks if the version of Binpicking on Robot controller and Vision controller match
    :return: True if match, False if not or if an error occurred
    """
    global bps_client_socket, pho_err_occurred, BRAND_ID

    # Send version info to Vision controller
    data = struct.pack('24s', BRAND_ID.encode(encoding='UTF-8'))
    status = client_socket_write(bps_client_socket, data)

    if status != 0:
        handle_socket_write_error(status, False, 'Unable to send the Robot ID to the Vision Controller.')
        return False

    return True


def pho_wait_for_server():
    """
    Function to establish connection to the Vision Controller
    :param server_ip: string with IPv4 address of Vision Controller (Robot interface)
    :return: True on success, False otherwise
    """
    global bps_client_socket, pho_err_occurred, pho_err_code
    global bps_client_flag, BINPICKING_SRV_IP
    connected = False

    # First try to close opened socket in case there was an error
    if bps_client_socket:
        try:
            client_socket_close(BINPICKING_SRV_IP)
        except:
            pass

    # Try to connect (there's no timeout possible, only exceptions)
    tp_log('Connecting to Vision Controller...')
    try:
        connected = bps_client_open_socket(BINPICKING_SRV_IP)
        bps_client_flag = True
    except:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE
        return False

    if connected:
        # Reset errors since the connection succeeded
        pho_err_occurred = False
        pho_err_code = PhoCommErr.OK

        # Check versions
        if bps_client_check_version():
            tp_log('Connection to Vision Controller established. IP: {}'.format(BINPICKING_SRV_IP))
            return True


def bps_client_send_request(request_id, vs_id, data=b''):
    """
    Appends data to standard header and sends request to Vision Controller
    :param request_id: Request ID. Valid values are defined in PhoRequest class
    :param vs_id: Vision System ID
    :param data: data in bytes to be send after header, i.e. 'PHO', req_id, vs_id
    :return: True if the request was successfully sent, False otherwise
    """
    global bps_client_socket, PHO_HEADER, BYTEORDER_FMT, PHO_DEBUG, PhoRequestND, pho_requests_blocked, \
        pho_err_occurred, pho_err_code, pho_last_request_id, pho_tool_point_invariance, pho_gripping_point_id, \
        pho_gripping_point_invariance

    if request_id not in PhoRequestND.keys():
        pho_err_occurred = True
        tp_log('Unknown request id: {}'.format(request_id))
        return False

    # Check socket status
    socket_status = client_socket_state(bps_client_socket)
    if socket_status != 1:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE
        return False

    bps_client_flush_socket()

    # Check if any unresolved request is blocking sending of this one
    if pho_requests_blocked:
        tp_popup('The "{}" request is blocked by the previous one!'.format(PhoRequestND[request_id]))
        pho_err_occurred = True
        return False

    # Requests related witch solutions operations, add calibration point
    if (9 <= request_id <= 13) or request_id == 5:
        pass
    else:
        data = vs_id.to_bytes(4, ENDIANNESS) + data

    data_size = len(data) // 4

    msg = get_header(payload_size=data_size, request_id=request_id)
    msg += data

    if PHO_DEBUG:
        tp_log('Sending Binpicking request: "{}"'.format(PhoRequestND[request_id]))

    status = client_socket_write(bps_client_socket, msg)
    if status != 0:
        msg = 'Binpicking client: Sending "{}" request has failed'.format(PhoRequestND[request_id])
        handle_socket_write_error(status, False, msg)
        return False
    else:
        # Sending the request succeeded => set blocking flag
        pho_last_request_id = request_id
        pho_requests_blocked = True
        return True


def bps_client_handle_operation_error(read_bytes, request_id):
    global bps_client_socket, pho_err_occurred, pho_err_code, PhoRequestND
    response, op_data = client_socket_read(bps_client_socket, length=read_bytes, timeout=-1)

    if response != read_bytes:
        pho_err_occurred = True
        msg = 'Error while reading operation data from request "{}".'.format(PhoRequestND[request_id])
        handle_socket_read_error(response, True, False, msg)

    (pho_err_code,) = struct.unpack(BYTEORDER_FMT + 'i', op_data)

    if pho_err_code != PhoCommErr.OK:
        pho_err_occurred = True
        msg = 'Wrong BP configuration! More details in Bin Picking Studio console. ({})'.format(pho_err_code)
        tp_log(msg)


def bps_client_handle_operation_trajectory(waypoints_count, fine, wait_time=0.5):
    """
    Receives one trajectory from BinPicking server (corresponding to 1 subheader)
    :param waypoints_count: or data array count; defined in the received header
    :param fine: (bool) defined by the received operation type
    :param wait_time: time to wait for receiving a single waypoint
    """
    global bps_client_socket, PHO_DEBUG, pho_err_occurred, pho_err_code, pho_trajectory_buffer, pho_trajectory_type

    WAYPOINT_MSG_SIZE = 32

    # Get index for saving waypoints to 'pho_trajectory_buffer' list
    trajectory_id = len(pho_trajectory_buffer)

    # Append list with 'fine' flag + waypoints placeholder for a new trajectory
    pho_trajectory_buffer.append([posj()] * waypoints_count)
    pho_trajectory_type.append(fine)

    for wp_id in range(waypoints_count):
        response, wp_data = client_socket_read(bps_client_socket, length=WAYPOINT_MSG_SIZE, timeout=wait_time)
        if response != WAYPOINT_MSG_SIZE:
            if PHO_DEBUG:
                msg = 'Error receiving {} waypoint.'.format(__int2ord(wp_id + 1))
                handle_socket_read_error(response, False, False, msg)
            pho_err_occurred = True
            pho_err_code = PhoCommErr.BAD_DATA
            return False

        unpacked_data = struct.unpack(BYTEORDER_FMT + 'i7f', wp_data)
        wp_msg_id = unpacked_data[0]
        joints = posj(*unpacked_data[1:7])
        joint_msg_crc = unpacked_data[7]
        joint_crc = sum(joints)

        # Check if the data are valid
        if (abs(joint_msg_crc - joint_crc) < 0.001) and (wp_msg_id == wp_id + 1):
            # Add waypoint to current trajectory data
            joints_deg = rad_2_deg(joints)
            pho_trajectory_buffer[trajectory_id][wp_id] = posj(joints_deg)
        else:
            msg = ''
            if wp_msg_id != wp_id + 1:
                msg += 'Incorrect waypoint ID received ({}, expected: {})! '.format(wp_msg_id, wp_id + 1)
            if not (abs(joint_msg_crc - joint_crc) < 0.001):
                msg += 'Joints checksum is incorrect (actual: {}, expected: {})!'.format(joint_crc, joint_msg_crc)

            tp_popup('Error while receiving trajectory! ' + msg, DR_PM_ALARM, 1)
            pho_err_occurred = True
            pho_err_code = PhoCommErr.BAD_DATA
            return False
    return True


def bps_client_handle_operation_other(request_id, wait_time=0.5):
    """
    Receives the data corresponding to subheaders which are followed by data consisting of a single integer
    :return: received int on success, None on failure
    """
    global bps_client_socket, pho_err_occurred, pho_err_code, PhoRequestND

    MSG_BYTES = 4
    response, op_data = client_socket_read(bps_client_socket, length=MSG_BYTES, timeout=wait_time)

    if response != MSG_BYTES:
        pho_err_occurred = True
        msg = 'Error while reading operation data from request "{}".'.format(PhoRequestND[request_id])
        handle_socket_read_error(response, True, False, msg)
        return None

    (msg,) = struct.unpack(BYTEORDER_FMT + 'i', op_data)
    return msg


def bps_client_handle_received_available_solutions(solutions_count, wait_time=0.5):
    """
    Received ids of available solutions
    :return: List of ids of available solutions
    """
    global bps_client_socket, pho_err_occurred, pho_err_code, PhoRequestND

    MSG_BYETS = 4
    available_solutions_list = []

    for solution in range(solutions_count):
        response, solution_id = client_socket_read(bps_client_socket, length=MSG_BYETS, timeout=wait_time)
        if response != MSG_BYETS:
            pho_err_occurred = True
            msg = 'Error while reading available solutions "{}".'.format(PhoRequestND[13])
            handle_socket_read_error(response, True, False, msg)
            return None

        (msg,) = struct.unpack(BYTEORDER_FMT + 'i', solution_id)
        available_solutions_list.append(msg)

    return available_solutions_list


def bps_client_handle_operation_object_pose(request_id, wait_time=0.5):
    """
    Receives the data corresponding to subheader with operation type PhoOperationType.OBJECT_POSE
    Check 'posx()' documentation for rotation explanation
    :return: 'posx' object on success, None on failure
    """
    global bps_client_socket, pho_err_occurred, pho_err_code, PhoRequestND
    MSG_BYTES = 24  # x, y, z, Rz, Ry, Rz'
    response, op_data = client_socket_read(bps_client_socket, length=MSG_BYTES, timeout=wait_time)

    if response != MSG_BYTES:
        pho_err_occurred = True
        msg = 'Error while reading "pose" operation data from request "{}".'.format(PhoRequestND[request_id])
        handle_socket_read_error(response, True, False, msg)
        return None

    x, y, z, rz, ry, rz2 = struct.unpack(BYTEORDER_FMT + '6f', op_data)
    rot_deg = rad_2_deg([rz, ry, rz2])
    return posx(x, y, z, rot_deg[0], rot_deg[1], rot_deg[2])


def bps_client_recv_response(request_id, wait_time):
    """
    Receives responses to previously sent requests to BPS server.
    :param request_id: (int) ID of sent request, for which a response is to be received.
    :param wait_time: (float) Time to wait for response in seconds
    :return: True if no error occurred, False otherwise
    """
    global BYTEORDER_FMT, bps_client_socket, pho_err_code, pho_err_occurred, pho_requests_blocked, \
        PhoRequestND, PhoOperationTypeND, PhoGripperCmdND, PhoOperationInfoND, pho_info_data, \
        pho_tool_point_invariance, pho_gripping_point_id, pho_gripping_point_invariance, \
        pho_object_pose, pho_reprojection_error, pho_last_request_id, pho_running_solution, \
        pho_available_solutions

    if request_id not in PhoRequestND.keys():
        pho_err_occurred = True
        tp_log('Unknown request id: {}'.format(request_id))
        return False

    HEADER_SIZE = 12
    SUB_HEADER_SIZE = 12

    # Check socket status
    socket_status = client_socket_state(bps_client_socket)
    if socket_status != 1:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE
        return not pho_err_occurred

    # Clear flags from previous request
    pho_err_occurred = False
    pho_err_code = PhoCommErr.OK
    pho_last_request_id = None

    # Wait for message header
    response, data = client_socket_read(bps_client_socket, length=HEADER_SIZE, timeout=wait_time)

    if response != HEADER_SIZE:
        pho_err_occurred = True
        handle_socket_read_error(response, True, True, 'Binpicking client.', 'Expected header data.')
        return not pho_err_occurred

    recv_req_id, n_subheaders, _ = struct.unpack(BYTEORDER_FMT + '3i', data)

    # Check if response matches the request type
    if recv_req_id != request_id:
        tp_log('ERROR: Request was "{}" ({}). Received "{}" ({})'.format(
            PhoRequestND[request_id], request_id, PhoRequestND.get(recv_req_id, '?'), recv_req_id))

        pho_err_occurred = True
        pho_err_code = PhoCommErr.BAD_DATA
        bps_client_flush_socket()

        return not pho_err_occurred

    if PHO_DEBUG:
        tp_log('Response to "{}" request: header: {} subheaders'.format(PhoRequestND[request_id], n_subheaders))

    # Start reading & processing subheaders
    for i_sub in range(n_subheaders):

        # Read subheader
        response, data = client_socket_read(bps_client_socket, length=SUB_HEADER_SIZE, timeout=wait_time)

        if response != SUB_HEADER_SIZE:
            pho_err_occurred = True
            handle_socket_read_error(response, True, True, 'Binpicking client.',
                                     'Expected {} sub-header data ({}B).'.format(__int2ord(i_sub), SUB_HEADER_SIZE))
            break

        operation_type, operation_number, data_array_count = struct.unpack(BYTEORDER_FMT + '3i', data)

        if PHO_DEBUG:
            tp_log('Read subheader {}. Operation type/number/data_array_count: {}/{}/{}'.format(
                i_sub,
                PhoOperationTypeND.get(operation_type, str(operation_type)),
                operation_number,
                data_array_count
            ))

        if request_id == PhoRequest.TRAJECTORY:
            pho_operations.append(operation_type)

        if operation_type == PhoOperationType.TRAJECTORY_CNT:
            bps_client_handle_operation_trajectory(data_array_count, False, wait_time)
        elif operation_type == PhoOperationType.TRAJECTORY_FINE:
            bps_client_handle_operation_trajectory(data_array_count, True, wait_time)
        elif operation_type == PhoOperationType.GRIPPER:
            gripper_op = bps_client_handle_operation_other(request_id)
            if PHO_DEBUG:
                tp_log('Received gripper operation: {} (operation number: {})'.format(gripper_op, operation_number))
        elif operation_type == PhoOperationType.ERROR:
            bps_client_handle_operation_error(data_array_count * 4, request_id)
            if pho_err_occurred:
                break
        elif operation_type == PhoOperationType.INFO:
            if recv_req_id == PhoRequest.GET_RUNNING_SOLUTION:
                pho_running_solution = bps_client_handle_operation_other(request_id)
                if PHO_DEBUG:
                    tp_log('Received running solution: {}'.format(pho_running_solution))
            elif recv_req_id == PhoRequest.GET_AVAILABLE_SOLUTIONS:
                pho_available_solutions = bps_client_handle_received_available_solutions(data_array_count)
                tp_log('available solutions: {}'.format(pho_available_solutions))
                pass
            else:
                pho_info = bps_client_handle_operation_other(request_id)
                pass
                if operation_number == PhoOperationInfo.TOOL_POINT_INV:
                    pho_tool_point_invariance = pho_info
                    if PHO_DEBUG:
                        tp_log('Received Info operation: tool_point_invariance: {}'.format(pho_info))
                elif operation_number == PhoOperationInfo.GRIPPING_ID:
                    pho_gripping_point_id = pho_info
                    if PHO_DEBUG:
                        tp_log('Received Info operation: gripping_point_id: {}'.format(pho_info))
                elif operation_number == PhoOperationInfo.GRIPPING_POINT_INV:
                    pho_gripping_point_invariance = pho_info
                    if PHO_DEBUG:
                        tp_log('Received Info operation: gripping_point_invariance: {}'.format(pho_info))
                else:
                    pho_info_data.append(pho_info)
                    if PHO_DEBUG:
                        tp_log('Received Info: {}'.format(pho_info))

        elif operation_type == PhoOperationType.OBJECT_POSE:
            pho_object_pose = bps_client_handle_operation_object_pose(request_id)
        else:
            msg = 'Response to "{}" request: Unknown type of operation received: {}'.format(
                PhoRequestND[request_id],
                PhoOperationTypeND.get(operation_type, )
            )
            tp_popup(msg, DR_PM_MESSAGE, 0)
            pho_err_occurred = True
            pho_err_code = PhoCommErr.UNKNOWN
            break
    return not pho_err_occurred


def pho_request_init(pho_start_bin_picking_pose, pho_end_bin_picking_pose, vision_system_id, wait_time=-1):
    """
    Request to initialize a bin picking session
    Sends start and end poses to Binpicking server.
    :param pho_start_bin_picking_pose: start pose. (posj) object or iterable with joint 1 - 6 states [deg]
    :param pho_end_bin_picking_pose: end pose. (posj) object or iterable with joint 1 - 6 states [deg]
    :param vision_system_id: (int) ID of the vision system
    :param wait_time: time to wait for response [sec]
    """
    global BYTEORDER_FMT, pho_requests_blocked

    start_pose_rad = deg_2_rad(pho_start_bin_picking_pose)
    end_pose_rad = deg_2_rad(pho_end_bin_picking_pose)
    joints_deg = [j_rad for j_rad in start_pose_rad] + [j_rad for j_rad in end_pose_rad]

    data = struct.pack(BYTEORDER_FMT + '12f', *joints_deg)

    if bps_client_send_request(PhoRequest.INITIALIZE, vision_system_id, data):
        bps_client_recv_response(PhoRequest.INITIALIZE, wait_time)
        pho_requests_blocked = False


def pho_request_scan(vision_system_id):
    """
    Sends a scan request
    """
    global PHO_DEBUG

    if PHO_DEBUG:
        tp_log('Binpicking client: Sending SCAN request for VS {}...'.format(vision_system_id))

    bps_client_send_request(PhoRequest.SCAN, vision_system_id)


def pho_request_trajectory(vision_system_id):
    """
    Sends request to receive a new trajectory
    """
    global pho_pick_allowed, pho_trajectory_buffer, pho_operations

    # Clear buffers from the previous trajectories
    pho_trajectory_buffer = []
    pho_operations = []

    bps_client_send_request(PhoRequest.TRAJECTORY, vision_system_id)
    pho_pick_allowed = False


def pho_request_calib_add_point():
    """
    Request to add point to calibration. Function is waiting for a confirmation from Vision Controller
    """
    global pho_requests_blocked
    if bps_client_send_request(PhoRequest.CALIB_ADD_POINT, 0):
        bps_client_recv_response(PhoRequest.CALIB_ADD_POINT, -1)
        pho_requests_blocked = False


def pho_request_send_pick_failed(vision_system_id):
    """
    Request to send pick failed
    """
    global pho_requests_blocked
    if bps_client_send_request(PhoRequest.PICK_FAILED, vision_system_id):
        bps_client_recv_response(PhoRequest.PICK_FAILED, -1)
        pho_requests_blocked = False


def pho_request_change_solution(required_solution_id):
    """
    Request for solution change
    """
    global pho_requests_blocked, BYTEORDER_FMT

    data = struct.pack(BYTEORDER_FMT + 'i', required_solution_id)

    if bps_client_send_request(PhoRequest.CHANGE_SOLUTION, 0, data):
        bps_client_recv_response(PhoRequest.CHANGE_SOLUTION, -1)
        pho_requests_blocked = False


def pho_request_start_solution(required_solution_id):
    """
    Request for start solution
    """
    global pho_requests_blocked, BYTEORDER_FMT

    data = struct.pack(BYTEORDER_FMT + 'i', required_solution_id)

    if bps_client_send_request(PhoRequest.START_SOLUTION, 0, data):
        bps_client_recv_response(PhoRequest.START_SOLUTION, -1)
        pho_requests_blocked = False


def pho_request_stop_solution():
    """
    Request for stop solution
    """
    global pho_requests_blocked, BYTEORDER_FMT

    if bps_client_send_request(PhoRequest.STOP_SOLUTION, 0):
        bps_client_recv_response(PhoRequest.STOP_SOLUTION, -1)
        pho_requests_blocked = False


def pho_request_get_running_solution():
    """
    Request for get running solution
    """
    global pho_requests_blocked, BYTEORDER_FMT

    if bps_client_send_request(PhoRequest.GET_RUNNING_SOLUTION, 0):
        bps_client_recv_response(PhoRequest.GET_RUNNING_SOLUTION, -1)
        pho_requests_blocked = False


def pho_request_get_available_solutions():
    """
    Request for get available solutions
    """
    global pho_requests_blocked, BYTEORDER_FMT

    if bps_client_send_request(PhoRequest.GET_AVAILABLE_SOLUTIONS, 0):
        bps_client_recv_response(PhoRequest.GET_AVAILABLE_SOLUTIONS, -1)
        pho_requests_blocked = False


def pho_request_object_pose(vision_system_id):
    """
    Request for an object pose
    """
    global pho_requests_blocked
    if bps_client_send_request(PhoRequest.OBJECT_POSE, vision_system_id):
        bps_client_recv_response(PhoRequest.OBJECT_POSE, -1)
        pho_requests_blocked = False


def pho_other_req(vision_system_id, data):
    """
    Request to send other customer data
    :param vision_system_id: (int) ID of the Vision System
    :param data: (bytes) data to be sent
    """
    global pho_requests_blocked, pho_err_occurred, pho_err_code

    if type(data) is not bytes:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.BAD_DATA
        tp_log('Error: incorrect data in customer request! Expecting bytes, got "{}".'.format(type(data)))
        return

    bps_client_send_request(PhoRequest.CUSTOMER, vision_system_id, data)
    pho_requests_blocked = False  # Not expecting any response


# ===== RESPONSES =====
def pho_wait_for_scan_completion(wait_time=-1):
    """
    Function to wait for confirmation message from the Vision Controller that the scanning has finished
    """
    global PHO_DEBUG, pho_err_occurred, pho_err_code, pho_requests_blocked

    if pho_err_occurred:
        if pho_err_code in [PhoCommErr.TIMEOUT, PhoCommErr.BAD_DATA, PhoCommErr.COMM_FAILURE]:
            return

    bps_client_recv_response(PhoRequest.SCAN, wait_time)
    pho_requests_blocked = False


def pho_receive_trajectory(wait_time=-1):
    """
    Receives a new trajectory from the Vision Controller after requesting it
    """
    global pho_pick_allowed, pho_requests_blocked, pho_err_occurred, pho_err_code

    if pho_err_occurred:
        if pho_err_code in [PhoCommErr.TIMEOUT, PhoCommErr.BAD_DATA, PhoCommErr.COMM_FAILURE]:
            return

    bps_client_recv_response(PhoRequest.TRAJECTORY, wait_time)
    pho_requests_blocked = False
    pho_pick_allowed = True





# CustomerDefinitions module v.1.6
# Copyright(c) 2022 Photoneo s.r.o.
# All rights reserved

# Implement gripper commands and adapt binpicking sequences to meet your application requirements

# -----------------------------------------------------------------------------
# -------------------- GRIPPER COMMANDS TO BE IMPLEMENTED ---------------------
# -----------------------------------------------------------------------------

# Implement command to attach part to gripper here
def gripper_attach():
    pass


# Implement command to detach part from gripper here
def gripper_detach():
    pass


# Implement your custom gripper command here
def gripper_user_1():
    pass


# Implement your custom gripper command here
def gripper_user_2():
    pass


# Implement your custom gripper command here
def gripper_user_3():
    pass


# -----------------------------------------------------------------------------
# ------------------------ BIN PICKING SPEED SETTINGS -------------------------
# -----------------------------------------------------------------------------

def binpicking_settings():
    """
    Set the joint speeds and accelerations for gripping path stages defined in Binpicking solution.
    Values are in [degrees per second] / [degrees per second^2].
    For each trajectory is possible to use a float value, which sets the same speed for each joint
    or a list of 6 floats, i.e. speed for joint 1 ... 6. [j1, j2, j3, j4, j5, j6]
    Acceleration settings are analogous to the speed settings.
    """
    global pho_speed_data, pho_acceleration_data

    # Init/reset the global settings
    pho_speed_data = []
    pho_acceleration_data = []

    # Maximal joint velocities for Doosan M1013 (j1, ...,j6) [degrees per second]
    # Adjust the joint velocities as appropriate for your application. Note that real velocities may be lower
    # than values defined here - depending on the distances of trajectory waypoints
    max_velocity = [120.0, 120.0, 180.0, 225.0, 225.0, 225.0]

    # Joint accelerations for (j1, ...,j6) [degrees per second^2]
    # Adjust the joint accelerations as appropriate for your application. Note that real accelerations may be lower
    # than values defined here - depending on the distances of trajectory waypoints
    acceleration = [400] * 6

    # 1st trajectory speed (Approach trajectory by default)
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 2nd trajectory speed (Grasp trajectory by default)
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 3rd trajectory speed (Deapproach trajectory by default)
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 4th trajectory speed (End trajectory by default)
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 5th trajectory speed
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 6th trajectory speed
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)


# -----------------------------------------------------------------------------
# ------------------------BIN PICKING IMPLEMENTATIONS -------------------------
# -----------------------------------------------------------------------------


def pho_bin_picking():
    """
    DO NOT EDIT!!!
    Standard bin picking implementation
    Allows for an execution of various number of operations. Joint velocities and accelerations
    are defined in 'binpicking_settings()'
    """
    global PHO_DEBUG, pho_trajectory_buffer, pho_operations, pho_speed_data, pho_acceleration_data, \
        pho_err_occurred, pho_pick_allowed

    trajectory_id = 0
    gripper_cmd_id = 1  # PhoGripperCmd.ATTACH

    # Set velocities and accelerations
    binpicking_settings()

    # Make sure that no errors occurred, otherwise return from the function
    if not pho_err_occurred:
        if not pho_pick_allowed:
            msg = 'Program flow error! Pick rejected. Possible causes: Repeated call: pho_bin_picking() OR '
            msg += 'Missing call: pho_receive_trajectory()'
            tp_popup(msg, DR_PM_ALARM, 1)
        else:
            # Execute received operations
            n_ops = len(pho_operations)
            for i, operation in enumerate(pho_operations):
                if PHO_DEBUG:
                    tp_log(
                        'operation {} of {}: {}({})...'.format(i, n_ops, PhoOperationTypeND.get(operation, '?'), operation))

                if operation in [PhoOperationType.TRAJECTORY_FINE, PhoOperationType.TRAJECTORY_CNT]:
                    velocity = pho_speed_data[trajectory_id]
                    acceleration = pho_acceleration_data[trajectory_id]

                    # Execute the movement (the robot have to start in the waypoint at index 0)
                    movesj(pho_trajectory_buffer[trajectory_id][1:], v=velocity, a=acceleration)
                    trajectory_id += 1

                elif operation == PhoOperationType.GRIPPER:
                    execute_gripper(gripper_cmd_id)
                    gripper_cmd_id += 1

    # Reset pick allowed flag
    pho_pick_allowed = False


def pho_execute_trajectory(trajectory_id, velocity=-1, acceleration=-1):
    """
    Executes a single trajectory
    :param trajectory_id: ID of the trajectory to execute
    :param velocity: positive float value or a list of 6 such values of joint velocities [deg/s] *
    :param acceleration: positive float value or a list of 6 such values of joint velocities [deg/s^2] *
    * otherwise global settings will be used from 'pho_speed_data', 'pho_acceleration_data'
    """
    global PHO_DEBUG, pho_trajectory_buffer, pho_operations, pho_speed_data, pho_acceleration_data
    use_velocity = 0
    use_acceleration = 0

    if PHO_DEBUG:
        tp_log('Executing trajectory {}'.format(trajectory_id))

    # Check if requested trajectory ID exists, exit if not
    if 0 <= trajectory_id < len(pho_trajectory_buffer):
        trajectory_waypoints = pho_trajectory_buffer[trajectory_id]

        # Determine which velocity will be used
        if hasattr(velocity, '__len__'):
            if len(velocity) == 6:
                use_velocity = velocity
        elif velocity > 0:
            use_velocity = velocity
        else:
            use_velocity = pho_speed_data[trajectory_id]

        # Determine which acceleration will be used
        if hasattr(acceleration, '__len__'):
            if len(acceleration) == 6:
                use_acceleration = acceleration
        elif acceleration > 0:
            use_acceleration = acceleration
        else:
            use_acceleration = pho_acceleration_data[trajectory_id]

        # Execute the movement (the robot have to start in the waypoint at index 0)
        movesj(trajectory_waypoints[1:], v=use_velocity, a=use_acceleration)


def execute_gripper(gripper_cmd_id):
    """
    Calls user defined code for executing a gripper command
    :param gripper_cmd_id: constant defined in PhoGripperCmd
    """
    if gripper_cmd_id == PhoGripperCmd.ATTACH:
        gripper_attach()
    elif gripper_cmd_id == PhoGripperCmd.DETACH:
        gripper_detach()
    elif gripper_cmd_id == PhoGripperCmd.USER_1:
        gripper_user_1()
    elif gripper_cmd_id == PhoGripperCmd.USER_2:
        gripper_user_2()
    elif gripper_cmd_id == PhoGripperCmd.USER_3:
        gripper_user_3()



#################### inputs ####################
#BINPICKING_SRV_IP = '192.168.137.10'
#BINPICKING_SRV_PORT = 11003
#STATE_SRV_PORT = 11004
#SOLUTION_ID = 2
#VS_ID = 1

#start_posj = posj(90,0,90,0,90,0)
#end_posj = posj(90,0,90,0,90,0)

state_server_flag = False
bps_client_flag = False 
result_message = [0,0,0,0,0,0,0]

def solution_test():
    global pho_err_code, pho_err_occurred, BINPICKING_SRV_IP
    global pho_running_solution
    global state_server_flag, bps_client_flag, result_message

    state_server_thread_id = pho_start_state_server()
    bps_thread_id = thread_run(pho_wait_for_server, loop=False)
    wait(3)
    tp_log(' 111111111111111111111111111 ')



    if (bps_client_flag):
        result_message[1] = 0
    else:
        result_message[1] = 3

    # solution deploy check
    if (bps_client_flag):
        pho_request_get_available_solutions()
        if ( len(pho_available_solutions) == 0):
            pass #tp_popup("There isn't availavle solution")
        else:
            pass #tp_popup("There is availavle solution")
        if SOLUTION_ID in pho_available_solutions:
            pass #tp_popup("Solution ID is validated")
        else:
            pass #tp_popup("Solution ID isn't validated")
            
        pho_request_get_running_solution()
        if (pho_running_solution == SOLUTION_ID):
            pass
        else:
            pho_request_stop_solution()
            pho_request_start_solution(SOLUTION_ID)


    
    # init
    pho_err_occurred = False
    pho_err_code = PhoCommErr.OK
    pho_request_init(start_posj, end_posj, VS_ID)
    
    if (pho_err_occurred):
        pass #result_message.append("Initialize fail ("+str(pho_err_code)+")")
    else:
        pass #result_message.append("Initialize success")
    result_message[2] = pho_err_code

    pho_err_occurred = False
    pho_err_code = PhoCommErr.OK
    pho_request_scan(VS_ID)
    
    wait(0.5)
    if (pho_err_occurred):
        pass #result_message.append("Scan request fail ("+str(pho_err_code)+")")
    else:
        pass #result_message.append("Scan request success")
    result_message[3] = pho_err_code

    pho_err_occurred = False
    pho_err_code = PhoCommErr.OK
    pho_wait_for_scan_completion()
    if (pho_err_occurred):
        pass #result_message.append("Scan receive fail ("+str(pho_err_code)+")")
    else:
        pass #result_message.append("Scan receive success")
    result_message[4] = pho_err_code

    pho_err_occurred = False
    pho_err_code = PhoCommErr.OK
    pho_request_trajectory(VS_ID)
    if (pho_err_occurred):
        pass #result_message.append("Trajectory request fail ("+str(pho_err_code)+")")
    else:
        pass #result_message.append("Trajectory request success")
    result_message[5] = pho_err_code

    pho_err_occurred = False
    pho_err_code = PhoCommErr.OK
    pho_receive_trajectory()
    if (pho_err_occurred):
        pass #result_message.append("Trajectory receive fail ("+str(pho_err_code)+")")
    else:
        pass #result_message.append("Trajectory receive success")
    result_message[6] = pho_err_code

    if (state_server_flag):
        
        pass #result_message.insert(0,"Robot state server success")
    else:
        result_message[0] = 3  
        pass #result_message.insert(0,"Robot state server fail")
    

    #_txt = 'result :'
    #for i in result_message:
    #    _txt += i
    #    _txt += '/'
    #tp_popup(_txt)

#################### main ####################
solution_test()

wait(2)
`

export const DRL_PhotoneoInputs = `
BINPICKING_SRV_PORT = 11003
STATE_SRV_PORT = 11004
BINPICKING_SRV_IP = '127.0.0.1'
home_pose = None
start_pose = None
end_pose = None
vision_system_id = 1
vel = 100
acc = 100
`

export const DRL_PhotoneoCommon = `
from DRCF import *
import struct

# PhotoneoCommon module v.1.6
# Copyright(c) 2022 Photoneo s.r.o.
# All rights reserved

# ===== GLOBAL CONSTANTS


PHO_DEBUG = False

# Port for binpicking server
# BINPICKING_SRV_PORT = 11003

# Robot brand
BRAND_ID = 'DOOSAN/1.6.0_XXXXXXXXXXX'

# This determines byteorder for sending data and representing received data.
# Native robot controller endianness is 'little' (tested using sys.byteorder)
ENDIANNESS = 'little'
BYTEORDER_FMT = {'little': '<', 'big': '>'}[ENDIANNESS]


def __auxi_get_dict_from_class_consts(c):
    """
    Helper function that returns Name Dictionary (ND) for enum-like classes
    """
    names = list(filter(lambda n: all(c.isupper() for c in n.split('_')), dir(c)))
    ids = [getattr(c, e) for e in names]
    return dict(zip(ids, names))


def get_header(payload_size, request_id):
    data = struct.pack(BYTEORDER_FMT + '5i', ord('P'), ord('H'), ord('O'), payload_size, request_id)
    return data


# Request types
class PhoRequest:
    SCAN = 1
    TRAJECTORY = 2
    INITIALIZE = 4
    CALIB_ADD_POINT = 5
    CUSTOMER = 6
    PICK_FAILED = 7
    OBJECT_POSE = 8
    CHANGE_SOLUTION = 9
    START_SOLUTION = 10
    STOP_SOLUTION = 11
    GET_RUNNING_SOLUTION = 12
    GET_AVAILABLE_SOLUTIONS = 13


# Dictionary with Request names and IDs
PhoRequestND = __auxi_get_dict_from_class_consts(PhoRequest)


# Operation types
class PhoOperationType:
    TRAJECTORY_CNT = 0
    TRAJECTORY_FINE = 1
    GRIPPER = 2
    ERROR = 3
    INFO = 4
    OBJECT_POSE = 5


# Dictionary with Operation names and IDs
PhoOperationTypeND = __auxi_get_dict_from_class_consts(PhoOperationType)


# Gripper commands
class PhoGripperCmd:
    ATTACH = 1
    DETACH = 2
    USER_1 = 3
    USER_2 = 4
    USER_3 = 5


# Dictionary with Gripper commands names and IDs
PhoGripperCmdND = __auxi_get_dict_from_class_consts(PhoGripperCmd)


# Info commands operations numbers
class PhoOperationInfo:
    TOOL_POINT_INV = 1
    GRIPPING_ID = 2
    GRIPPING_POINT_INV = 3


# Dictionary with Info commands names and IDs
PhoOperationInfoND = __auxi_get_dict_from_class_consts(PhoOperationInfo)


# Error codes: communication
class PhoCommErr:
    OK = 0
    SERVICE_ERR = 1
    UNKNOWN_REQ = 2
    COMM_FAILURE = 3
    BAD_DATA = 4
    TIMEOUT = 5


# Dictionary with communication error names and IDs
PhoCommErrND = __auxi_get_dict_from_class_consts(PhoCommErr)

PHO_COMM_ERR_STOP = True


# Error codes: Binpicking
class PhoBipiErr:
    PLANNING_FAILED = 201
    NO_PART_FOUND = 202
    NOT_INITIALIZED = 203
    EMPTY_SCENE = 218
    WRONG_BP_CONF = 255


# Dictionary with Binpicking error names and IDs
PhoBipiErrND = __auxi_get_dict_from_class_consts(PhoBipiErr)

# ===== GLOBAL VARIABLES =====

# User Error Info
pho_err_occurred = False
pho_err_code = PhoCommErr.OK

# User Info Variables
pho_tool_point_invariance = -1
pho_gripping_point_id = -1
pho_gripping_point_invariance = -1
pho_info_data = []

# Currently sent requests awaiting response
pho_requests_blocked = False  # True if there's a blocking request and cannot send another one

# Last rquest ID
pho_last_request_id = None

# Operation related variables
pho_trajectory_buffer = []  # 'list' of 'posj' joint poses for trajectory waypoints
pho_trajectory_type = []  # (bool) if trajectory on the same index si "FINE" (or "CNT")
pho_operations = []  # stores operations order from  TRAJECTORY request responses

# pho_num_of_operations = 0
pho_object_pose = None

# Calibration related variables
pho_reprojection_error = -1

# Pick allowed flag
pho_pick_allowed = False

# Bin picking speed and acceleration data
pho_speed_data = []
pho_acceleration_data = []

# solutions
pho_running_solution = -1
pho_available_solutions = []


# Auxiliary functions
def __int2ord(i):
    """
    :param i: integer
    :return: string representing ordinal number of i
    """
    if abs(i) > 3 or i == 0:
        return '{}-th'.format(i)
    else:
        return '{}-{}'.format(i, ['st', 'nd', 'rd'][i - 1])


# ===== COMMON =====
bps_client_socket = None


def deg_2_rad(deg):
    rad = []
    for d in deg:
        tmp = d2r(d)
        rad.append(round(tmp, 5))
    return tuple(rad)


def rad_2_deg(rad):
    deg = []
    for r in rad:
        tmp = r2d(r)
        deg.append(round(tmp, 5))
    return deg


    
    
def handle_socket_read_error(response=0, set_err_code=True, log=True, message1='', message2=''):
    global PHO_DEBUG, pho_err_code
    if response >= 0:
        if set_err_code: pho_err_code = PhoCommErr.BAD_DATA
        if log or PHO_DEBUG:
            tp_log(message1 + ' Did receive incorrect length of data ({}B). '.format(response) + message2)
    elif response == -1:
        if set_err_code: pho_err_code = PhoCommErr.COMM_FAILURE
        if log or PHO_DEBUG:
            tp_log(message1 + ' The client is not connected (-1). ' + message2)
    elif response == -2:
        if set_err_code: pho_err_code = PhoCommErr.COMM_FAILURE
        if log or PHO_DEBUG:
            tp_log(message1 + ' Socket.error occurred during data reception (-2). ' + message2)
    elif response == -3:
        if set_err_code: pho_err_code = PhoCommErr.TIMEOUT
        if log or PHO_DEBUG:
            tp_log(message1 + ' Timeout during data reception. Expected version data (-3). ' + message2)
    else:
        if set_err_code: pho_err_code = PhoCommErr.BAD_DATA
        if log or PHO_DEBUG:
            tp_log(message1 + ' Unknown socket reading error ({})'.format(response) + message2)


def handle_socket_write_error(status=0, log=True, message1='', message2='', set_pho_err=True):
    global PHO_DEBUG, pho_err_code, pho_err_occurred
    if set_pho_err:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE

    if status == -1:
        if log or PHO_DEBUG:
            tp_log(message1 + ' The client is not connected (-1). ' + message2)
    elif status == -2:
        if log or PHO_DEBUG:
            tp_log(message1 + ' Server/Client is disconnected, or socket.error occurred during a data transfer (-2). '
                + message2)
    else:
        if log or PHO_DEBUG:
            tp_log(message1 + ' Unknown error during socket write ({}) '.format(status) + message2)


def bps_client_open_socket(server_ip):
    """
    Connect as a client to BPS server.
    """
    global bps_client_socket, BINPICKING_SRV_PORT, pho_err_occurred, pho_err_code
    try:
        bps_client_socket = client_socket_open(server_ip, BINPICKING_SRV_PORT)
        return True
    except:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE
        tp_log('Connection to Vision Controller failed.')
        return False


def bps_client_flush_socket():
    global bps_client_socket
    flag = True
    while flag:
        response, _ = client_socket_read(bps_client_socket, length=4, timeout=0.05)
        flag = response > 0


def bps_client_check_version():
    """
    Checks if the version of Binpicking on Robot controller and Vision controller match
    :return: True if match, False if not or if an error occurred
    """
    global bps_client_socket, pho_err_occurred, BRAND_ID

    # Send version info to Vision controller
    data = struct.pack('24s', BRAND_ID.encode(encoding='UTF-8'))
    status = client_socket_write(bps_client_socket, data)

    if status != 0:
        handle_socket_write_error(status, False, 'Unable to send the Robot ID to the Vision Controller.')
        return False

    return True


def pho_wait_for_server(server_ip):
    """
    Function to establish connection to the Vision Controller
    :param server_ip: string with IPv4 address of Vision Controller (Robot interface)
    :return: True on success, False otherwise
    """
    global bps_client_socket, pho_err_occurred, pho_err_code

    connected = False

    # First try to close opened socket in case there was an error
    if bps_client_socket:
        try:
            client_socket_close(bps_client_socket)
        except:
            pass

    # Try to connect (there's no timeout possible, only exceptions)
    tp_log('Connecting to Vision Controller...')
    try:
        connected = bps_client_open_socket(server_ip)
    except:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE
        return False

    if connected:
        # Reset errors since the connection succeeded
        pho_err_occurred = False
        pho_err_code = PhoCommErr.OK

        # Check versions
        if bps_client_check_version():
            tp_log('Connection to Vision Controller established. IP: {}'.format(server_ip))
            return True


def bps_client_send_request(request_id, vs_id, data=b''):
    """
    Appends data to standard header and sends request to Vision Controller
    :param request_id: Request ID. Valid values are defined in PhoRequest class
    :param vs_id: Vision System ID
    :param data: data in bytes to be send after header, i.e. 'PHO', req_id, vs_id
    :return: True if the request was successfully sent, False otherwise
    """
    global bps_client_socket, PHO_HEADER, BYTEORDER_FMT, PHO_DEBUG, PhoRequestND, pho_requests_blocked, \
        pho_err_occurred, pho_err_code, pho_last_request_id, pho_tool_point_invariance, pho_gripping_point_id, \
        pho_gripping_point_invariance

    if request_id not in PhoRequestND.keys():
        pho_err_occurred = True
        tp_log('Unknown request id: {}'.format(request_id))
        return False

    # Check socket status
    socket_status = client_socket_state(bps_client_socket)
    if socket_status != 1:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE
        return False

    bps_client_flush_socket()

    # Check if any unresolved request is blocking sending of this one
    if pho_requests_blocked:
        tp_popup('The "{}" request is blocked by the previous one!'.format(PhoRequestND[request_id]))
        pho_err_occurred = True
        return False

    # Requests related witch solutions operations, add calibration point
    if (9 <= request_id <= 13) or request_id == 5:
        pass
    else:
        data = vs_id.to_bytes(4, ENDIANNESS) + data

    data_size = len(data) // 4

    msg = get_header(payload_size=data_size, request_id=request_id)
    msg += data

    if PHO_DEBUG:
        tp_log('Sending Binpicking request: "{}"'.format(PhoRequestND[request_id]))

    status = client_socket_write(bps_client_socket, msg)
    if status != 0:
        msg = 'Binpicking client: Sending "{}" request has failed'.format(PhoRequestND[request_id])
        handle_socket_write_error(status, False, msg)
        return False
    else:
        # Sending the request succeeded => set blocking flag
        pho_last_request_id = request_id
        pho_requests_blocked = True
        return True


def bps_client_handle_operation_error(read_bytes, request_id):
    global bps_client_socket, pho_err_occurred, pho_err_code, PhoRequestND
    response, op_data = client_socket_read(bps_client_socket, length=read_bytes, timeout=-1)

    if response != read_bytes:
        pho_err_occurred = True
        msg = 'Error while reading operation data from request "{}".'.format(PhoRequestND[request_id])
        handle_socket_read_error(response, True, False, msg)

    (pho_err_code,) = struct.unpack(BYTEORDER_FMT + 'i', op_data)

    if pho_err_code != PhoCommErr.OK:
        pho_err_occurred = True
        msg = 'Wrong BP configuration! More details in Bin Picking Studio console. ({})'.format(pho_err_code)
        tp_log(msg)


def bps_client_handle_operation_trajectory(waypoints_count, fine, wait_time=0.5):
    """
    Receives one trajectory from BinPicking server (corresponding to 1 subheader)
    :param waypoints_count: or data array count; defined in the received header
    :param fine: (bool) defined by the received operation type
    :param wait_time: time to wait for receiving a single waypoint
    """
    global bps_client_socket, PHO_DEBUG, pho_err_occurred, pho_err_code, pho_trajectory_buffer, pho_trajectory_type

    WAYPOINT_MSG_SIZE = 32

    # Get index for saving waypoints to 'pho_trajectory_buffer' list
    trajectory_id = len(pho_trajectory_buffer)

    # Append list with 'fine' flag + waypoints placeholder for a new trajectory
    pho_trajectory_buffer.append([posj()] * waypoints_count)
    pho_trajectory_type.append(fine)

    for wp_id in range(waypoints_count):
        response, wp_data = client_socket_read(bps_client_socket, length=WAYPOINT_MSG_SIZE, timeout=wait_time)
        if response != WAYPOINT_MSG_SIZE:
            if PHO_DEBUG:
                msg = 'Error receiving {} waypoint.'.format(__int2ord(wp_id + 1))
                handle_socket_read_error(response, False, False, msg)
            pho_err_occurred = True
            pho_err_code = PhoCommErr.BAD_DATA
            return False

        unpacked_data = struct.unpack(BYTEORDER_FMT + 'i7f', wp_data)
        wp_msg_id = unpacked_data[0]
        joints = posj(*unpacked_data[1:7])
        joint_msg_crc = unpacked_data[7]
        joint_crc = sum(joints)

        # Check if the data are valid
        if (abs(joint_msg_crc - joint_crc) < 0.001) and (wp_msg_id == wp_id + 1):
            # Add waypoint to current trajectory data
            joints_deg = rad_2_deg(joints)
            pho_trajectory_buffer[trajectory_id][wp_id] = posj(joints_deg)
        else:
            msg = ''
            if wp_msg_id != wp_id + 1:
                msg += 'Incorrect waypoint ID received ({}, expected: {})! '.format(wp_msg_id, wp_id + 1)
            if not (abs(joint_msg_crc - joint_crc) < 0.001):
                msg += 'Joints checksum is incorrect (actual: {}, expected: {})!'.format(joint_crc, joint_msg_crc)

            tp_popup('Error while receiving trajectory! ' + msg, DR_PM_ALARM, 1)
            pho_err_occurred = True
            pho_err_code = PhoCommErr.BAD_DATA
            return False
    return True


def bps_client_handle_operation_other(request_id, wait_time=0.5):
    """
    Receives the data corresponding to subheaders which are followed by data consisting of a single integer
    :return: received int on success, None on failure
    """
    global bps_client_socket, pho_err_occurred, pho_err_code, PhoRequestND

    MSG_BYTES = 4
    response, op_data = client_socket_read(bps_client_socket, length=MSG_BYTES, timeout=wait_time)

    if response != MSG_BYTES:
        pho_err_occurred = True
        msg = 'Error while reading operation data from request "{}".'.format(PhoRequestND[request_id])
        handle_socket_read_error(response, True, False, msg)
        return None

    (msg,) = struct.unpack(BYTEORDER_FMT + 'i', op_data)
    return msg


def bps_client_handle_received_available_solutions(solutions_count, wait_time=0.5):
    """
    Received ids of available solutions
    :return: List of ids of available solutions
    """
    global bps_client_socket, pho_err_occurred, pho_err_code, PhoRequestND

    MSG_BYETS = 4
    available_solutions_list = []

    for solution in range(solutions_count):
        response, solution_id = client_socket_read(bps_client_socket, length=MSG_BYETS, timeout=wait_time)
        if response != MSG_BYETS:
            pho_err_occurred = True
            msg = 'Error while reading available solutions "{}".'.format(PhoRequestND[13])
            handle_socket_read_error(response, True, False, msg)
            return None

        (msg,) = struct.unpack(BYTEORDER_FMT + 'i', solution_id)
        available_solutions_list.append(msg)

    return available_solutions_list


def bps_client_handle_operation_object_pose(request_id, wait_time=0.5):
    """
    Receives the data corresponding to subheader with operation type PhoOperationType.OBJECT_POSE
    Check 'posx()' documentation for rotation explanation
    :return: 'posx' object on success, None on failure
    """
    global bps_client_socket, pho_err_occurred, pho_err_code, PhoRequestND
    MSG_BYTES = 24  # x, y, z, Rz, Ry, Rz'
    response, op_data = client_socket_read(bps_client_socket, length=MSG_BYTES, timeout=wait_time)

    if response != MSG_BYTES:
        pho_err_occurred = True
        msg = 'Error while reading "pose" operation data from request "{}".'.format(PhoRequestND[request_id])
        handle_socket_read_error(response, True, False, msg)
        return None

    x, y, z, rz, ry, rz2 = struct.unpack(BYTEORDER_FMT + '6f', op_data)
    rot_deg = rad_2_deg([rz, ry, rz2])
    return posx(x, y, z, rot_deg[0], rot_deg[1], rot_deg[2])


def bps_client_recv_response(request_id, wait_time):
    """
    Receives responses to previously sent requests to BPS server.
    :param request_id: (int) ID of sent request, for which a response is to be received.
    :param wait_time: (float) Time to wait for response in seconds
    :return: True if no error occurred, False otherwise
    """
    global BYTEORDER_FMT, bps_client_socket, pho_err_code, pho_err_occurred, pho_requests_blocked, \
        PhoRequestND, PhoOperationTypeND, PhoGripperCmdND, PhoOperationInfoND, pho_info_data, \
        pho_tool_point_invariance, pho_gripping_point_id, pho_gripping_point_invariance, \
        pho_object_pose, pho_reprojection_error, pho_last_request_id, pho_running_solution, \
        pho_available_solutions

    # Check if correct request was sent preceding this receive call
    if request_id != pho_last_request_id:
        pho_err_occurred = True
        if pho_last_request_id is None:
            tp_popup('Program flow error. Missing request call preceding the current response call.', DR_PM_ALARM, 1)
        else:
            tp_popup('Program flow error. Incorrect request call preceding the current response call. '
                'Expected "{}"'.format(PhoRequestND.get(request_id, request_id)), DR_PM_ALARM, 1)
        return False

    if request_id not in PhoRequestND.keys():
        pho_err_occurred = True
        tp_log('Unknown request id: {}'.format(request_id))
        return False

    HEADER_SIZE = 12
    SUB_HEADER_SIZE = 12

    # Check socket status
    socket_status = client_socket_state(bps_client_socket)
    if socket_status != 1:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE
        return not pho_err_occurred

    # Clear flags from previous request
    pho_err_occurred = False
    pho_err_code = PhoCommErr.OK
    pho_last_request_id = None

    # Wait for message header
    response, data = client_socket_read(bps_client_socket, length=HEADER_SIZE, timeout=wait_time)

    if response != HEADER_SIZE:
        pho_err_occurred = True
        handle_socket_read_error(response, True, True, 'Binpicking client.', 'Expected header data.')
        return not pho_err_occurred

    recv_req_id, n_subheaders, _ = struct.unpack(BYTEORDER_FMT + '3i', data)

    # Check if response matches the request type
    if recv_req_id != request_id:
        tp_log('ERROR: Request was "{}" ({}). Received "{}" ({})'.format(
            PhoRequestND[request_id], request_id, PhoRequestND.get(recv_req_id, '?'), recv_req_id))

        pho_err_occurred = True
        pho_err_code = PhoCommErr.BAD_DATA
        bps_client_flush_socket()

        return not pho_err_occurred

    if PHO_DEBUG:
        tp_log('Response to "{}" request: header: {} subheaders'.format(PhoRequestND[request_id], n_subheaders))

    # Start reading & processing subheaders
    for i_sub in range(n_subheaders):

        # Read subheader
        response, data = client_socket_read(bps_client_socket, length=SUB_HEADER_SIZE, timeout=wait_time)

        if response != SUB_HEADER_SIZE:
            pho_err_occurred = True
            handle_socket_read_error(response, True, True, 'Binpicking client.',
                                    'Expected {} sub-header data ({}B).'.format(__int2ord(i_sub), SUB_HEADER_SIZE))
            break

        operation_type, operation_number, data_array_count = struct.unpack(BYTEORDER_FMT + '3i', data)

        if PHO_DEBUG:
            tp_log('Read subheader {}. Operation type/number/data_array_count: {}/{}/{}'.format(
                i_sub,
                PhoOperationTypeND.get(operation_type, str(operation_type)),
                operation_number,
                data_array_count
            ))

        if request_id == PhoRequest.TRAJECTORY:
            pho_operations.append(operation_type)

        if operation_type == PhoOperationType.TRAJECTORY_CNT:
            bps_client_handle_operation_trajectory(data_array_count, False, wait_time)
        elif operation_type == PhoOperationType.TRAJECTORY_FINE:
            bps_client_handle_operation_trajectory(data_array_count, True, wait_time)
        elif operation_type == PhoOperationType.GRIPPER:
            gripper_op = bps_client_handle_operation_other(request_id)
            if PHO_DEBUG:
                tp_log('Received gripper operation: {} (operation number: {})'.format(gripper_op, operation_number))
        elif operation_type == PhoOperationType.ERROR:
            bps_client_handle_operation_error(data_array_count * 4, request_id)
            if pho_err_occurred:
                break
        elif operation_type == PhoOperationType.INFO:
            if recv_req_id == PhoRequest.GET_RUNNING_SOLUTION:
                pho_running_solution = bps_client_handle_operation_other(request_id)
                if PHO_DEBUG:
                    tp_log('Received running solution: {}'.format(pho_running_solution))
            elif recv_req_id == PhoRequest.GET_AVAILABLE_SOLUTIONS:
                pho_available_solutions = bps_client_handle_received_available_solutions(data_array_count)
                tp_log('available solutions: {}'.format(pho_available_solutions))
                pass
            else:
                pho_info = bps_client_handle_operation_other(request_id)
                pass
                if operation_number == PhoOperationInfo.TOOL_POINT_INV:
                    pho_tool_point_invariance = pho_info
                    if PHO_DEBUG:
                        tp_log('Received Info operation: tool_point_invariance: {}'.format(pho_info))
                elif operation_number == PhoOperationInfo.GRIPPING_ID:
                    pho_gripping_point_id = pho_info
                    if PHO_DEBUG:
                        tp_log('Received Info operation: gripping_point_id: {}'.format(pho_info))
                elif operation_number == PhoOperationInfo.GRIPPING_POINT_INV:
                    pho_gripping_point_invariance = pho_info
                    if PHO_DEBUG:
                        tp_log('Received Info operation: gripping_point_invariance: {}'.format(pho_info))
                else:
                    pho_info_data.append(pho_info)
                    if PHO_DEBUG:
                        tp_log('Received Info: {}'.format(pho_info))

        elif operation_type == PhoOperationType.OBJECT_POSE:
            pho_object_pose = bps_client_handle_operation_object_pose(request_id)
        else:
            msg = 'Response to "{}" request: Unknown type of operation received: {}'.format(
                PhoRequestND[request_id],
                PhoOperationTypeND.get(operation_type, )
            )
            tp_popup(msg, DR_PM_MESSAGE, 0)
            pho_err_occurred = True
            pho_err_code = PhoCommErr.UNKNOWN
            break
    return not pho_err_occurred


def pho_request_init(pho_start_bin_picking_pose, pho_end_bin_picking_pose, vision_system_id, wait_time=-1):
    """
    Request to initialize a bin picking session
    Sends start and end poses to Binpicking server.
    :param pho_start_bin_picking_pose: start pose. (posj) object or iterable with joint 1 - 6 states [deg]
    :param pho_end_bin_picking_pose: end pose. (posj) object or iterable with joint 1 - 6 states [deg]
    :param vision_system_id: (int) ID of the vision system
    :param wait_time: time to wait for response [sec]
    """
    global BYTEORDER_FMT, pho_requests_blocked

    start_pose_rad = deg_2_rad(pho_start_bin_picking_pose)
    end_pose_rad = deg_2_rad(pho_end_bin_picking_pose)
    joints_deg = [j_rad for j_rad in start_pose_rad] + [j_rad for j_rad in end_pose_rad]

    data = struct.pack(BYTEORDER_FMT + '12f', *joints_deg)

    if bps_client_send_request(PhoRequest.INITIALIZE, vision_system_id, data):
        bps_client_recv_response(PhoRequest.INITIALIZE, wait_time)
        pho_requests_blocked = False


def pho_request_scan(vision_system_id):
    """
    Sends a scan request
    """
    global PHO_DEBUG

    if PHO_DEBUG:
        tp_log('Binpicking client: Sending SCAN request for VS {}...'.format(vision_system_id))

    bps_client_send_request(PhoRequest.SCAN, vision_system_id)


def pho_request_trajectory(vision_system_id):
    """
    Sends request to receive a new trajectory
    """
    global pho_pick_allowed, pho_trajectory_buffer, pho_operations

    # Clear buffers from the previous trajectories
    pho_trajectory_buffer = []
    pho_operations = []

    bps_client_send_request(PhoRequest.TRAJECTORY, vision_system_id)
    pho_pick_allowed = False


def pho_request_calib_add_point():
    """
    Request to add point to calibration. Function is waiting for a confirmation from Vision Controller
    """
    global pho_requests_blocked
    if bps_client_send_request(PhoRequest.CALIB_ADD_POINT, 0):
        bps_client_recv_response(PhoRequest.CALIB_ADD_POINT, -1)
        pho_requests_blocked = False


def pho_request_send_pick_failed(vision_system_id):
    """
    Request to send pick failed
    """
    global pho_requests_blocked
    if bps_client_send_request(PhoRequest.PICK_FAILED, vision_system_id):
        bps_client_recv_response(PhoRequest.PICK_FAILED, -1)
        pho_requests_blocked = False


def pho_request_change_solution(required_solution_id):
    """
    Request for solution change
    """
    global pho_requests_blocked, BYTEORDER_FMT

    data = struct.pack(BYTEORDER_FMT + 'i', required_solution_id)

    if bps_client_send_request(PhoRequest.CHANGE_SOLUTION, 0, data):
        bps_client_recv_response(PhoRequest.CHANGE_SOLUTION, -1)
        pho_requests_blocked = False


def pho_request_start_solution(required_solution_id):
    """
    Request for start solution
    """
    global pho_requests_blocked, BYTEORDER_FMT

    data = struct.pack(BYTEORDER_FMT + 'i', required_solution_id)

    if bps_client_send_request(PhoRequest.START_SOLUTION, 0, data):
        bps_client_recv_response(PhoRequest.START_SOLUTION, -1)
        pho_requests_blocked = False


def pho_request_stop_solution():
    """
    Request for stop solution
    """
    global pho_requests_blocked, BYTEORDER_FMT

    if bps_client_send_request(PhoRequest.STOP_SOLUTION, 0):
        bps_client_recv_response(PhoRequest.STOP_SOLUTION, -1)
        pho_requests_blocked = False


def pho_request_get_running_solution():
    """
    Request for get running solution
    """
    global pho_requests_blocked, BYTEORDER_FMT

    if bps_client_send_request(PhoRequest.GET_RUNNING_SOLUTION, 0):
        bps_client_recv_response(PhoRequest.GET_RUNNING_SOLUTION, -1)
        pho_requests_blocked = False


def pho_request_get_available_solutions():
    """
    Request for get available solutions
    """
    global pho_requests_blocked, BYTEORDER_FMT

    if bps_client_send_request(PhoRequest.GET_AVAILABLE_SOLUTIONS, 0):
        bps_client_recv_response(PhoRequest.GET_AVAILABLE_SOLUTIONS, -1)
        pho_requests_blocked = False


def pho_request_object_pose(vision_system_id):
    """
    Request for an object pose
    """
    global pho_requests_blocked
    if bps_client_send_request(PhoRequest.OBJECT_POSE, vision_system_id):
        bps_client_recv_response(PhoRequest.OBJECT_POSE, -1)
        pho_requests_blocked = False


def pho_other_req(vision_system_id, data):
    """
    Request to send other customer data
    :param vision_system_id: (int) ID of the Vision System
    :param data: (bytes) data to be sent
    """
    global pho_requests_blocked, pho_err_occurred, pho_err_code

    if type(data) is not bytes:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.BAD_DATA
        tp_log('Error: incorrect data in customer request! Expecting bytes, got "{}".'.format(type(data)))
        return

    bps_client_send_request(PhoRequest.CUSTOMER, vision_system_id, data)
    pho_requests_blocked = False  # Not expecting any response


# ===== RESPONSES =====
def pho_wait_for_scan_completion(wait_time=-1):
    """
    Function to wait for confirmation message from the Vision Controller that the scanning has finished
    """
    global PHO_DEBUG, pho_err_occurred, pho_err_code, pho_requests_blocked

    if pho_err_occurred:
        if pho_err_code in [PhoCommErr.TIMEOUT, PhoCommErr.BAD_DATA, PhoCommErr.COMM_FAILURE]:
            return

    bps_client_recv_response(PhoRequest.SCAN, wait_time)
    pho_requests_blocked = False


def pho_receive_trajectory(wait_time=-1):
    """
    Receives a new trajectory from the Vision Controller after requesting it
    """
    global pho_pick_allowed, pho_requests_blocked, pho_err_occurred, pho_err_code

    if pho_err_occurred:
        if pho_err_code in [PhoCommErr.TIMEOUT, PhoCommErr.BAD_DATA, PhoCommErr.COMM_FAILURE]:
            return

    bps_client_recv_response(PhoRequest.TRAJECTORY, wait_time)
    pho_requests_blocked = False
    pho_pick_allowed = True

`

export const DRL_CustomerDefinitions = `
# CustomerDefinitions module v.1.6
# Copyright(c) 2022 Photoneo s.r.o.
# All rights reserved

# Implement gripper commands and adapt binpicking sequences to meet your application requirements

# -----------------------------------------------------------------------------
# -------------------- GRIPPER COMMANDS TO BE IMPLEMENTED ---------------------
# -----------------------------------------------------------------------------


# Implement command to attach part to gripper here
def gripper_attach():
    pass


# Implement command to detach part from gripper here
def gripper_detach():
    pass


# Implement your custom gripper command here
def gripper_user_1():
    pass


# Implement your custom gripper command here
def gripper_user_2():
    pass


# Implement your custom gripper command here
def gripper_user_3():
    pass


# -----------------------------------------------------------------------------
# ------------------------ BIN PICKING SPEED SETTINGS -------------------------
# -----------------------------------------------------------------------------

def binpicking_settings():
    """
    Set the joint speeds and accelerations for gripping path stages defined in Binpicking solution.
    Values are in [degrees per second] / [degrees per second^2].
    For each trajectory is possible to use a float value, which sets the same speed for each joint
    or a list of 6 floats, i.e. speed for joint 1 ... 6. [j1, j2, j3, j4, j5, j6]
    Acceleration settings are analogous to the speed settings.
    """
    global pho_speed_data, pho_acceleration_data

    # Init/reset the global settings
    pho_speed_data = []
    pho_acceleration_data = []

    # Maximal joint velocities for Doosan M1013 (j1, ...,j6) [degrees per second]
    # Adjust the joint velocities as appropriate for your application. Note that real velocities may be lower
    # than values defined here - depending on the distances of trajectory waypoints
    max_velocity = [120.0, 120.0, 180.0, 225.0, 225.0, 225.0]

    # Joint accelerations for (j1, ...,j6) [degrees per second^2]
    # Adjust the joint accelerations as appropriate for your application. Note that real accelerations may be lower
    # than values defined here - depending on the distances of trajectory waypoints
    acceleration = [400] * 6

    # 1st trajectory speed (Approach trajectory by default)
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 2nd trajectory speed (Grasp trajectory by default)
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 3rd trajectory speed (Deapproach trajectory by default)
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 4th trajectory speed (End trajectory by default)
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 5th trajectory speed
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 6th trajectory speed
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)


# -----------------------------------------------------------------------------
# ------------------------BIN PICKING IMPLEMENTATIONS -------------------------
# -----------------------------------------------------------------------------


def pho_bin_picking():
    """
    DO NOT EDIT!!!
    Standard bin picking implementation
    Allows for an execution of various number of operations. Joint velocities and accelerations
    are defined in 'binpicking_settings()'
    """
    global PHO_DEBUG, pho_trajectory_buffer, pho_operations, pho_speed_data, pho_acceleration_data, \
        pho_err_occurred, pho_pick_allowed

    trajectory_id = 0
    gripper_cmd_id = 1  # PhoGripperCmd.ATTACH

    # Set velocities and accelerations
    binpicking_settings()

    # Make sure that no errors occurred, otherwise return from the function
    if not pho_err_occurred:
        if not pho_pick_allowed:
            msg = 'Program flow error! Pick rejected. Possible causes: Repeated call: pho_bin_picking() OR '
            msg += 'Missing call: pho_receive_trajectory()'
            tp_popup(msg, DR_PM_ALARM, 1)
        else:
            # Execute received operations
            n_ops = len(pho_operations)
            for i, operation in enumerate(pho_operations):
                if PHO_DEBUG:
                    tp_log(
                        'operation {} of {}: {}({})...'.format(i, n_ops, PhoOperationTypeND.get(operation, '?'), operation))

                if operation in [PhoOperationType.TRAJECTORY_FINE, PhoOperationType.TRAJECTORY_CNT]:
                    velocity = pho_speed_data[trajectory_id]
                    acceleration = pho_acceleration_data[trajectory_id]

                    # Execute the movement (the robot have to start in the waypoint at index 0)
                    movesj(pho_trajectory_buffer[trajectory_id][1:], v=velocity, a=acceleration)
                    trajectory_id += 1

                elif operation == PhoOperationType.GRIPPER:
                    execute_gripper(gripper_cmd_id)
                    gripper_cmd_id += 1

    # Reset pick allowed flag
    pho_pick_allowed = False


def pho_execute_trajectory(trajectory_id, velocity=-1, acceleration=-1):
    """
    Executes a single trajectory
    :param trajectory_id: ID of the trajectory to execute
    :param velocity: positive float value or a list of 6 such values of joint velocities [deg/s] *
    :param acceleration: positive float value or a list of 6 such values of joint velocities [deg/s^2] *
    * otherwise global settings will be used from 'pho_speed_data', 'pho_acceleration_data'
    """
    global PHO_DEBUG, pho_trajectory_buffer, pho_operations, pho_speed_data, pho_acceleration_data
    use_velocity = 0
    use_acceleration = 0

    if PHO_DEBUG:
        tp_log('Executing trajectory {}'.format(trajectory_id))

    # Check if requested trajectory ID exists, exit if not
    if 0 <= trajectory_id < len(pho_trajectory_buffer):
        trajectory_waypoints = pho_trajectory_buffer[trajectory_id]

        # Determine which velocity will be used
        if hasattr(velocity, '__len__'):
            if len(velocity) == 6:
                use_velocity = velocity
        elif velocity > 0:
            use_velocity = velocity
        else:
            use_velocity = pho_speed_data[trajectory_id]

        # Determine which acceleration will be used
        if hasattr(acceleration, '__len__'):
            if len(acceleration) == 6:
                use_acceleration = acceleration
        elif acceleration > 0:
            use_acceleration = acceleration
        else:
            use_acceleration = pho_acceleration_data[trajectory_id]

        # Execute the movement (the robot have to start in the waypoint at index 0)
        movesj(trajectory_waypoints[1:], v=use_velocity, a=use_acceleration)


def execute_gripper(gripper_cmd_id):
    """
    Calls user defined code for executing a gripper command
    :param gripper_cmd_id: constant defined in PhoGripperCmd
    """
    if gripper_cmd_id == PhoGripperCmd.ATTACH:
        gripper_attach()
    elif gripper_cmd_id == PhoGripperCmd.DETACH:
        gripper_detach()
    elif gripper_cmd_id == PhoGripperCmd.USER_1:
        gripper_user_1()
    elif gripper_cmd_id == PhoGripperCmd.USER_2:
        gripper_user_2()
    elif gripper_cmd_id == PhoGripperCmd.USER_3:
        gripper_user_3()

`

export const DRL_StateServer = `
# StateServer module v.1.6
# Copyright(c) 2022 Photoneo s.r.o.
# All rights reserved

# -----------------------------------------------------------------------------
# --------------------------- PHOTONEO STATE SERVER ---------------------------
# -----------------------------------------------------------------------------

# Default port of state server
#STATE_SRV_PORT = 11004


JOINT_STATE_MSG_ID = 1
TOOL_POSE_MSG_ID = 2

# This determines byteorder for sending data and representing received data.
# Native robot controller endianness is 'little' (tested using sys.byteorder)
ENDIANNESS = 'little'
BYTEORDER_FMT = {'little': '<', 'big': '>'}[ENDIANNESS]

JOINTS_STATE_FMT = '6f'
JOINTS_STATE_BYTES = struct.calcsize(JOINTS_STATE_FMT)

TOOL0_POSE_FMT = '6f'
TOOL0_POSE_BYTES = struct.calcsize(TOOL0_POSE_FMT)

stsrv_socket = None

PHO_DEBUG_STSRV = False


def stsrv_handle_socket_write_error(status=0, log=True, message1='', message2=''):
    global PHO_DEBUG_STSRV

    if status == -1:
        if log or PHO_DEBUG_STSRV:
            tp_log(message1 + ' The client is not connected (-1). ' + message2)
    elif status == -2:
        if log or PHO_DEBUG_STSRV:
            tp_log(message1 + ' Server/Client is disconnected, or socket.error occurred during a data transfer (-2). '
                    + message2)
    else:
        if log or PHO_DEBUG_STSRV:
            tp_log(message1 + ' Unknown error during socket write ({}) '.format(status) + message2)


def get_tool0_pose():
    """
    Returns the current tool0
    position in robot (base) space in [mm]
    and orientation as Euler angles ZYZ [degrees]
    """
    return get_current_tool_flange_posx(DR_BASE)


def get_tool0_pose_as_bytes():
    global TOOL0_POSE_FMT, BYTEORDER_FMT
    pose = get_tool0_pose()
    data = struct.pack(BYTEORDER_FMT + TOOL0_POSE_FMT, *pose)
    return data


def get_joints_state_as_bytes():
    """
    Gets current joint states in degrees
    and converts the 6 floats (j1, ..j6) to bytes
    """
    global JOINTS_STATE_FMT, BYTEORDER_FMT
    joints_deg = get_current_posj()
    return struct.pack(BYTEORDER_FMT + JOINTS_STATE_FMT, *joints_deg)


def stsrv_open_socket():
    global STATE_SRV_PORT, stsrv_socket
    stsrv_socket = server_socket_open(STATE_SRV_PORT)


def stsrv_send_joints_state():
    global stsrv_socket, JOINT_STATE_MSG_ID
    data = get_header(payload_size=6, request_id=JOINT_STATE_MSG_ID)
    data += get_joints_state_as_bytes()
    return data


def stsrv_send_tcp_state():
    global stsrv_socket, TOOL_POSE_MSG_ID
    data = get_header(payload_size=6, request_id=TOOL_POSE_MSG_ID)
    data += get_tool0_pose_as_bytes()
    return data


def stsrv_check_version():
    global stsrv_socket, BRAND_ID

    data = struct.pack('24s', BRAND_ID.encode(encoding='UTF-8'))
    status = server_socket_write(stsrv_socket, data)

    if status != 0:
        stsrv_handle_socket_write_error(status, True, 'Unable to send the Robot ID to the Vision Controller', '')
        return False

    return True


def run_state_server():
    global stsrv_socket, PHO_DEBUG_STSRV

    tp_log('State server: waiting for a new connection')
    stsrv_open_socket()

    if stsrv_check_version():
        status = 0
        while status == 0:
            data = stsrv_send_joints_state()
            status_joint = server_socket_write(stsrv_socket, data)
            if status_joint != 0:
                stsrv_handle_socket_write_error(status_joint, True, 'An error occurred while sending joint status')

            data = stsrv_send_tcp_state()
            status_tcp = server_socket_write(stsrv_socket, data)
            if status_tcp != 0:
                stsrv_handle_socket_write_error(status_tcp, True, 'An error occurred while sending tcp status')

            status = status_joint + status_tcp
            wait(0.1)

        stsrv_handle_socket_write_error(status, True, 'State server:', '')
        wait(1.0)  # Wait after failure

    server_socket_close(stsrv_socket)
    tp_log('State server: Vision Controller has disconnected')


def pho_start_state_server():
    """
    Starts the State server in a separate thread
    """
    return thread_run(run_state_server, loop=True)

`

export const DRL_main = `
# BasicExample module v.1.6
# Copyright(c) 2022 Photoneo s.r.o.
# All rights reserved


# Adjust Vision Controller IP address if necessary
#BINPICKING_SRV_IP = '127.0.0.1'

# Definition of global variables (proper values are set in the main function)
#home_pose = None
#start_pose = None
#end_pose = None

MAX_ERR_COUNT = 2
err_counter = 0

def main_binpicking_example_basic():
    global pho_err_code, pho_err_occurred, err_counter, BINPICKING_SRV_IP,  home_pose, start_pose, end_pose, vision_system_id
    # Start the state server in a separate thread
    pho_start_state_server()

    # Reset state of error handling variables
    err_counter = 0
    pho_err_code = PhoCommErr.OK


    # Note that: Instead of the poses definitions below you may also
    # use joint pose variables defined in the task (in properties of task commands: GlobalVariables / Define),
    # where you can adjust the values more easily when working with teach pendant

    # Reteach home position for your application
    #home_pose = posj(167.0, -27.0, -101.0, 178.0, 48.0, -16.0)

    # Reteach bin picking start and end pose
    #start_pose = posj(167.0, -38.0, -101.0, 178.0, 48.0, -16.0)
    #end_pose = posj(150.0, -38.0, -101.0, 178.0, 48.0, -16.0)

    # Set Vision System ID (default = 1)
    #vision_system_id = 1
    tp_log('Error occurred: {}'.format(BINPICKING_SRV_IP))
    # Connect to the Vision Controller,
    if not pho_wait_for_server(BINPICKING_SRV_IP):
        exit()

    # Send bin picking initialization request for the current Vision System ID,
    # start & end poses sent via this request will be used in trajectory planning pipeline
    pho_request_init(start_pose, end_pose, vision_system_id)

    # Move the robot out of the scanning volume!
    movej(home_pose, vel=vel, acc=acc)

    # Request first scan
    pho_request_scan(vision_system_id)

    while True:
        # ==================== PHOTONEO BIN PICKING START ====================
        # Wait for scan completion
        pho_wait_for_scan_completion()

        # Handle errors if occurred
        if pho_err_occurred:
            err_handling(vision_system_id)
            continue  # start the loop again

        # Request trajectory
        pho_request_trajectory(vision_system_id)

        # Move to start position while the trajectory is being calculated
        movej(start_pose, vel=vel, acc=acc)

        # Receive trajectory (sequence of operations & operations data)
        pho_receive_trajectory()

        # Execute bin picking application if the trajectory was received with no error
        if not pho_err_occurred:
            pho_bin_picking()
        # ==================== PHOTONEO BIN PICKING END ====================

        if pho_err_occurred:
            err_handling(vision_system_id)
            continue
        else:
            # Clear error counter
            err_counter = 0

            # ==================== PLACING START ====================
            # Move the robot away so that we can trigger a new scan
            # movej(home_pose, vel=vel, acc=acc)

            # Trigger next scan, so that
            # localization and trajectory computation for the next cycle can run while the object is being placed
            pho_request_scan(vision_system_id)

            # Commands for actual part placing (reteach position for your robot and work cell)
            # movej(posj(0.0, 0.0, 0.0, 0.0, 0.0, 0.0), v=50, a=100)
            # gripper_detach()
            # movej(home_pose, vel=vel, acc=acc)
            # ==================== PLACING END ====================

            
def err_handling(vision_system_id):
    global pho_err_occurred, pho_err_code, MAX_ERR_COUNT, err_counter, \
        home_pose, start_pose, end_pose, BINPICKING_SRV_IP

    # Release the gripper if necessary
    # gripper_detach()

    # Move robot to home pose
    movej(home_pose, vel=vel, acc=acc)

    # Log the error
    err_code_str = '"{}" ({})'.format(
        PhoCommErrND.get(pho_err_code, PhoBipiErrND.get(pho_err_code, '?')),
        pho_err_code)
    tp_log('Error occurred: {}'.format(err_code_str))

    if err_counter >= MAX_ERR_COUNT:
        # Log error & exit (exits via the popup window)
        tp_popup('Photoneo internal error: {}. '
                    'Please reboot the Vision Controller and restart application'.format(err_code_str),
                    DR_PM_ALARM, 1)

    # If planning failed or no part was found, notify user and continue by a new scan request (Adjust if necessary)
    if pho_err_code in [PhoBipiErr.PLANNING_FAILED, PhoBipiErr.NO_PART_FOUND]:
        tp_log('No part found or path planning failed')
        pho_request_scan(vision_system_id)

    # If bin picking has not been initialized or service returned error response,
    # reinitialize and send a new scan request (Adjust if necessary)
    elif pho_err_code == PhoBipiErr.NOT_INITIALIZED:
        wait(5.0)
        pho_request_init(start_pose, end_pose, vision_system_id)
        pho_request_scan(vision_system_id)

    # if bin picking returned error response, reinitialize and trigger a new scan (Adjust if necessary)
    elif pho_err_code == PhoCommErr.SERVICE_ERR:
        wait(10.0)
        pho_request_init(start_pose, end_pose, vision_system_id)
        pho_request_scan(vision_system_id)

    # In case of communication failure, log the error and exit program
    elif pho_err_code in [PhoCommErr.BAD_DATA, PhoCommErr.TIMEOUT, PhoCommErr.COMM_FAILURE]:
        wait(10.0)
        pho_wait_for_server(BINPICKING_SRV_IP)
        pho_request_init(start_pose, end_pose, vision_system_id)
        pho_request_scan(vision_system_id)

    # Otherwise trigger next scan and try to continue
    else:
        pho_request_scan(vision_system_id)

    err_counter += 1

    # Clear the error flag
    pho_err_occurred = False
`

export const DRL_Calibration_add_one_point = `
# StateServer module v.1.6
# Copyright(c) 2022 Photoneo s.r.o.
# All rights reserved

# -----------------------------------------------------------------------------
# --------------------------- PHOTONEO STATE SERVER ---------------------------
# -----------------------------------------------------------------------------

import struct

# Default port of state server
#STATE_SRV_PORT = 11004


JOINT_STATE_MSG_ID = 1
TOOL_POSE_MSG_ID = 2

# This determines byteorder for sending data and representing received data.
# Native robot controller endianness is 'little' (tested using sys.byteorder)
ENDIANNESS = 'little'
BYTEORDER_FMT = {'little': '<', 'big': '>'}[ENDIANNESS]

JOINTS_STATE_FMT = '6f'
JOINTS_STATE_BYTES = struct.calcsize(JOINTS_STATE_FMT)

TOOL0_POSE_FMT = '6f'
TOOL0_POSE_BYTES = struct.calcsize(TOOL0_POSE_FMT)

stsrv_socket = None

PHO_DEBUG_STSRV = False
# Robot brand
BRAND_ID = 'DOOSAN/1.6.0_XXXXXXXXXXX'

def get_header(payload_size, request_id):
    data = struct.pack(BYTEORDER_FMT + '5i', ord('P'), ord('H'), ord('O'), payload_size, request_id)
    return data
def stsrv_handle_socket_write_error(status, log=True, message1='', message2=''):
    global PHO_DEBUG_STSRV

    if status == -1:
        if log or PHO_DEBUG_STSRV:
            tp_log(message1 + ' The client is not connected (-1). ' + message2)
    elif status == -2:
        if log or PHO_DEBUG_STSRV:
            tp_log(message1 + ' Server/Client is disconnected, or socket.error occurred during a data transfer (-2). '
                   + message2)
    else:
        if log or PHO_DEBUG_STSRV:
            tp_log(message1 + ' Unknown error during socket write ({}) '.format(status) + message2)


def get_tool0_pose():
    """
    Returns the current tool0
    position in robot (base) space in [mm]
    and orientation as Euler angles ZYZ [degrees]
    """
    return get_current_tool_flange_posx(DR_BASE)


def get_tool0_pose_as_bytes():
    global TOOL0_POSE_FMT, BYTEORDER_FMT
    pose = get_tool0_pose()
    data = struct.pack(BYTEORDER_FMT + TOOL0_POSE_FMT, *pose)
    return data


def get_joints_state_as_bytes():
    """
    Gets current joint states in degrees
    and converts the 6 floats (j1, ..j6) to bytes
    """
    global JOINTS_STATE_FMT, BYTEORDER_FMT
    joints_deg = get_current_posj()
    return struct.pack(BYTEORDER_FMT + JOINTS_STATE_FMT, *joints_deg)


def stsrv_open_socket():
    global STATE_SRV_PORT, stsrv_socket
    stsrv_socket = server_socket_open(STATE_SRV_PORT)


def stsrv_send_joints_state():
    global stsrv_socket, JOINT_STATE_MSG_ID
    data = get_header(payload_size=6, request_id=JOINT_STATE_MSG_ID)
    data += get_joints_state_as_bytes()
    return data


def stsrv_send_tcp_state():
    global stsrv_socket, TOOL_POSE_MSG_ID
    data = get_header(payload_size=6, request_id=TOOL_POSE_MSG_ID)
    data += get_tool0_pose_as_bytes()
    return data


def stsrv_check_version():
    global stsrv_socket, BRAND_ID

    data = struct.pack('24s', BRAND_ID.encode(encoding='UTF-8'))
    status = server_socket_write(stsrv_socket, data)

    if status != 0:
        stsrv_handle_socket_write_error(status, True, 'Unable to send the Robot ID to the Vision Controller', '')
        return False

    return True


def run_state_server():
    global stsrv_socket, PHO_DEBUG_STSRV

    tp_log('State server: waiting for a new connection')
    stsrv_open_socket()

    if stsrv_check_version():
        status = 0
        while status == 0:
            data = stsrv_send_joints_state()
            status_joint = server_socket_write(stsrv_socket, data)
            if status_joint != 0:
                stsrv_handle_socket_write_error(status_joint, True, 'An error occurred while sending joint status')

            data = stsrv_send_tcp_state()
            status_tcp = server_socket_write(stsrv_socket, data)
            if status_tcp != 0:
                stsrv_handle_socket_write_error(status_tcp, True, 'An error occurred while sending tcp status')

            status = status_joint + status_tcp
            wait(0.1)

        stsrv_handle_socket_write_error(status, True, 'State server:', '')
        wait(1.0)  # Wait after failure

    server_socket_close(stsrv_socket)
    tp_log('State server: Vision Controller has disconnected')


def pho_start_state_server():
    """
    Starts the State server in a separate thread
    """
    return thread_run(run_state_server, loop=True)



# PhotoneoCommon module v.1.6
# Copyright(c) 2022 Photoneo s.r.o.
# All rights reserved

# ===== GLOBAL CONSTANTS
PHO_DEBUG = False

# Port for binpicking server
#BINPICKING_SRV_PORT = 11003

# Robot brand
BRAND_ID = 'DOOSAN/1.6.0_XXXXXXXXXXX'

# This determines byteorder for sending data and representing received data.
# Native robot controller endianness is 'little' (tested using sys.byteorder)
ENDIANNESS = 'little'
BYTEORDER_FMT = {'little': '<', 'big': '>'}[ENDIANNESS]


def __auxi_get_dict_from_class_consts(c):
    """
    Helper function that returns Name Dictionary (ND) for enum-like classes
    """
    names = list(filter(lambda n: all(c.isupper() for c in n.split('_')), dir(c)))
    ids = [getattr(c, e) for e in names]
    return dict(zip(ids, names))


def get_header(payload_size, request_id):
    data = struct.pack(BYTEORDER_FMT + '5i', ord('P'), ord('H'), ord('O'), payload_size, request_id)
    return data


# Request types
class PhoRequest:
    SCAN = 1
    TRAJECTORY = 2
    INITIALIZE = 4
    CALIB_ADD_POINT = 5
    CUSTOMER = 6
    PICK_FAILED = 7
    OBJECT_POSE = 8
    CHANGE_SOLUTION = 9
    START_SOLUTION = 10
    STOP_SOLUTION = 11
    GET_RUNNING_SOLUTION = 12
    GET_AVAILABLE_SOLUTIONS = 13


# Dictionary with Request names and IDs
PhoRequestND = __auxi_get_dict_from_class_consts(PhoRequest)


# Operation types
class PhoOperationType:
    TRAJECTORY_CNT = 0
    TRAJECTORY_FINE = 1
    GRIPPER = 2
    ERROR = 3
    INFO = 4
    OBJECT_POSE = 5


# Dictionary with Operation names and IDs
PhoOperationTypeND = __auxi_get_dict_from_class_consts(PhoOperationType)


# Gripper commands
class PhoGripperCmd:
    ATTACH = 1
    DETACH = 2
    USER_1 = 3
    USER_2 = 4
    USER_3 = 5


# Dictionary with Gripper commands names and IDs
PhoGripperCmdND = __auxi_get_dict_from_class_consts(PhoGripperCmd)


# Info commands operations numbers
class PhoOperationInfo:
    TOOL_POINT_INV = 1
    GRIPPING_ID = 2
    GRIPPING_POINT_INV = 3


# Dictionary with Info commands names and IDs
PhoOperationInfoND = __auxi_get_dict_from_class_consts(PhoOperationInfo)


# Error codes: communication
class PhoCommErr:
    OK = 0
    SERVICE_ERR = 1
    UNKNOWN_REQ = 2
    COMM_FAILURE = 3
    BAD_DATA = 4
    TIMEOUT = 5


# Dictionary with communication error names and IDs
PhoCommErrND = __auxi_get_dict_from_class_consts(PhoCommErr)

PHO_COMM_ERR_STOP = True


# Error codes: Binpicking
class PhoBipiErr:
    PLANNING_FAILED = 201
    NO_PART_FOUND = 202
    NOT_INITIALIZED = 203
    EMPTY_SCENE = 218
    WRONG_BP_CONF = 255


# Dictionary with Binpicking error names and IDs
PhoBipiErrND = __auxi_get_dict_from_class_consts(PhoBipiErr)

# ===== GLOBAL VARIABLES =====

# User Error Info
pho_err_occurred = False
pho_err_code = PhoCommErr.OK

# User Info Variables
pho_tool_point_invariance = -1
pho_gripping_point_id = -1
pho_gripping_point_invariance = -1
pho_info_data = []

# Currently sent requests awaiting response
pho_requests_blocked = False  # True if there's a blocking request and cannot send another one

# Last rquest ID
pho_last_request_id = None

# Operation related variables
pho_trajectory_buffer = []  # 'list' of 'posj' joint poses for trajectory waypoints
pho_trajectory_type = []  # (bool) if trajectory on the same index si "FINE" (or "CNT")
pho_operations = []  # stores operations order from  TRAJECTORY request responses

# pho_num_of_operations = 0
pho_object_pose = None

# Calibration related variables
pho_reprojection_error = -1

# Pick allowed flag
pho_pick_allowed = False

# Bin picking speed and acceleration data
pho_speed_data = []
pho_acceleration_data = []

# solutions
pho_running_solution = -1
pho_available_solutions = []


# Auxiliary functions
def __int2ord(i):
    """
    :param i: integer
    :return: string representing ordinal number of i
    """
    if abs(i) > 3 or i == 0:
        return '{}-th'.format(i)
    else:
        return '{}-{}'.format(i, ['st', 'nd', 'rd'][i - 1])


# ===== COMMON =====
bps_client_socket = None


def deg_2_rad(deg):
    rad = []
    for d in deg:
        tmp = d2r(d)
        rad.append(round(tmp, 5))
    return tuple(rad)


def rad_2_deg(rad):
    deg = []
    for r in rad:
        tmp = r2d(r)
        deg.append(round(tmp, 5))
    return deg


def handle_socket_read_error(response, set_err_code, log=True, message1='', message2=''):
    global PHO_DEBUG, pho_err_code
    if response >= 0:
        if set_err_code: pho_err_code = PhoCommErr.BAD_DATA
        if log or PHO_DEBUG:
            tp_log(message1 + ' Did receive incorrect length of data ({}B). '.format(response) + message2)
    elif response == -1:
        if set_err_code: pho_err_code = PhoCommErr.COMM_FAILURE
        if log or PHO_DEBUG:
            tp_log(message1 + ' The client is not connected (-1). ' + message2)
    elif response == -2:
        if set_err_code: pho_err_code = PhoCommErr.COMM_FAILURE
        if log or PHO_DEBUG:
            tp_log(message1 + ' Socket.error occurred during data reception (-2). ' + message2)
    elif response == -3:
        if set_err_code: pho_err_code = PhoCommErr.TIMEOUT
        if log or PHO_DEBUG:
            tp_log(message1 + ' Timeout during data reception. Expected version data (-3). ' + message2)
    else:
        if set_err_code: pho_err_code = PhoCommErr.BAD_DATA
        if log or PHO_DEBUG:
            tp_log(message1 + ' Unknown socket reading error ({})'.format(response) + message2)


def handle_socket_write_error(status, log=True, message1='', message2='', set_pho_err=True):
    global PHO_DEBUG, pho_err_code, pho_err_occurred
    if set_pho_err:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE

    if status == -1:
        if log or PHO_DEBUG:
            tp_log(message1 + ' The client is not connected (-1). ' + message2)
    elif status == -2:
        if log or PHO_DEBUG:
            tp_log(message1 + ' Server/Client is disconnected, or socket.error occurred during a data transfer (-2). '
                   + message2)
    else:
        if log or PHO_DEBUG:
            tp_log(message1 + ' Unknown error during socket write ({}) '.format(status) + message2)


def bps_client_open_socket(server_ip):
    """
    Connect as a client to BPS server.
    """
    global bps_client_socket, BINPICKING_SRV_PORT, pho_err_occurred, pho_err_code
    try:
        bps_client_socket = client_socket_open(server_ip, BINPICKING_SRV_PORT)
        return True
    except:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE
        tp_log('Connection to Vision Controller failed.')
        return False


def bps_client_flush_socket():
    global bps_client_socket
    flag = True
    while flag:
        response, _ = client_socket_read(bps_client_socket, length=4, timeout=0.05)
        flag = response > 0


def bps_client_check_version():
    """
    Checks if the version of Binpicking on Robot controller and Vision controller match
    :return: True if match, False if not or if an error occurred
    """
    global bps_client_socket, pho_err_occurred, BRAND_ID

    # Send version info to Vision controller
    data = struct.pack('24s', BRAND_ID.encode(encoding='UTF-8'))
    status = client_socket_write(bps_client_socket, data)

    if status != 0:
        handle_socket_write_error(status, False, 'Unable to send the Robot ID to the Vision Controller.')
        return False

    return True


def pho_wait_for_server(server_ip):
    """
    Function to establish connection to the Vision Controller
    :param server_ip: string with IPv4 address of Vision Controller (Robot interface)
    :return: True on success, False otherwise
    """
    global bps_client_socket, pho_err_occurred, pho_err_code

    connected = False

    # First try to close opened socket in case there was an error
    if bps_client_socket:
        try:
            client_socket_close(bps_client_socket)
        except:
            pass

    # Try to connect (there's no timeout possible, only exceptions)
    tp_log('Connecting to Vision Controller...')
    try:
        connected = bps_client_open_socket(server_ip)
    except:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE
        return False

    if connected:
        # Reset errors since the connection succeeded
        pho_err_occurred = False
        pho_err_code = PhoCommErr.OK

        # Check versions
        if bps_client_check_version():
            tp_log('Connection to Vision Controller established. IP: {}'.format(server_ip))
            return True


def bps_client_send_request(request_id, vs_id, data=b''):
    """
    Appends data to standard header and sends request to Vision Controller
    :param request_id: Request ID. Valid values are defined in PhoRequest class
    :param vs_id: Vision System ID
    :param data: data in bytes to be send after header, i.e. 'PHO', req_id, vs_id
    :return: True if the request was successfully sent, False otherwise
    """
    global bps_client_socket, PHO_HEADER, BYTEORDER_FMT, PHO_DEBUG, PhoRequestND, pho_requests_blocked, \
        pho_err_occurred, pho_err_code, pho_last_request_id, pho_tool_point_invariance, pho_gripping_point_id, \
        pho_gripping_point_invariance

    if request_id not in PhoRequestND.keys():
        pho_err_occurred = True
        tp_log('Unknown request id: {}'.format(request_id))
        return False

    # Check socket status
    socket_status = client_socket_state(bps_client_socket)
    if socket_status != 1:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE
        return False

    bps_client_flush_socket()

    # Check if any unresolved request is blocking sending of this one
    if pho_requests_blocked:
        tp_popup('The "{}" request is blocked by the previous one!'.format(PhoRequestND[request_id]))
        pho_err_occurred = True
        return False

    # Requests related witch solutions operations, add calibration point
    if (9 <= request_id <= 13) or request_id == 5:
        pass
    else:
        data = vs_id.to_bytes(4, ENDIANNESS) + data

    data_size = len(data) // 4

    msg = get_header(payload_size=data_size, request_id=request_id)
    msg += data

    if PHO_DEBUG:
        tp_log('Sending Binpicking request: "{}"'.format(PhoRequestND[request_id]))

    status = client_socket_write(bps_client_socket, msg)
    if status != 0:
        msg = 'Binpicking client: Sending "{}" request has failed'.format(PhoRequestND[request_id])
        handle_socket_write_error(status, False, msg)
        return False
    else:
        # Sending the request succeeded => set blocking flag
        pho_last_request_id = request_id
        pho_requests_blocked = True
        return True


def bps_client_handle_operation_error(read_bytes, request_id):
    global bps_client_socket, pho_err_occurred, pho_err_code, PhoRequestND
    response, op_data = client_socket_read(bps_client_socket, length=read_bytes, timeout=-1)

    if response != read_bytes:
        pho_err_occurred = True
        msg = 'Error while reading operation data from request "{}".'.format(PhoRequestND[request_id])
        handle_socket_read_error(response, True, False, msg)

    (pho_err_code,) = struct.unpack(BYTEORDER_FMT + 'i', op_data)

    if pho_err_code != PhoCommErr.OK:
        pho_err_occurred = True
        msg = 'Wrong BP configuration! More details in Bin Picking Studio console. ({})'.format(pho_err_code)
        tp_log(msg)


def bps_client_handle_operation_trajectory(waypoints_count, fine, wait_time=0.5):
    """
    Receives one trajectory from BinPicking server (corresponding to 1 subheader)
    :param waypoints_count: or data array count; defined in the received header
    :param fine: (bool) defined by the received operation type
    :param wait_time: time to wait for receiving a single waypoint
    """
    global bps_client_socket, PHO_DEBUG, pho_err_occurred, pho_err_code, pho_trajectory_buffer, pho_trajectory_type

    WAYPOINT_MSG_SIZE = 32

    # Get index for saving waypoints to 'pho_trajectory_buffer' list
    trajectory_id = len(pho_trajectory_buffer)

    # Append list with 'fine' flag + waypoints placeholder for a new trajectory
    pho_trajectory_buffer.append([posj()] * waypoints_count)
    pho_trajectory_type.append(fine)

    for wp_id in range(waypoints_count):
        response, wp_data = client_socket_read(bps_client_socket, length=WAYPOINT_MSG_SIZE, timeout=wait_time)
        if response != WAYPOINT_MSG_SIZE:
            if PHO_DEBUG:
                msg = 'Error receiving {} waypoint.'.format(__int2ord(wp_id + 1))
                handle_socket_read_error(response, False, False, msg)
            pho_err_occurred = True
            pho_err_code = PhoCommErr.BAD_DATA
            return False

        unpacked_data = struct.unpack(BYTEORDER_FMT + 'i7f', wp_data)
        wp_msg_id = unpacked_data[0]
        joints = posj(*unpacked_data[1:7])
        joint_msg_crc = unpacked_data[7]
        joint_crc = sum(joints)

        # Check if the data are valid
        if (abs(joint_msg_crc - joint_crc) < 0.001) and (wp_msg_id == wp_id + 1):
            # Add waypoint to current trajectory data
            joints_deg = rad_2_deg(joints)
            pho_trajectory_buffer[trajectory_id][wp_id] = posj(joints_deg)
        else:
            msg = ''
            if wp_msg_id != wp_id + 1:
                msg += 'Incorrect waypoint ID received ({}, expected: {})! '.format(wp_msg_id, wp_id + 1)
            if not (abs(joint_msg_crc - joint_crc) < 0.001):
                msg += 'Joints checksum is incorrect (actual: {}, expected: {})!'.format(joint_crc, joint_msg_crc)

            tp_popup('Error while receiving trajectory! ' + msg, DR_PM_ALARM, 1)
            pho_err_occurred = True
            pho_err_code = PhoCommErr.BAD_DATA
            return False
    return True


def bps_client_handle_operation_other(request_id, wait_time=0.5):
    """
    Receives the data corresponding to subheaders which are followed by data consisting of a single integer
    :return: received int on success, None on failure
    """
    global bps_client_socket, pho_err_occurred, pho_err_code, PhoRequestND

    MSG_BYTES = 4
    response, op_data = client_socket_read(bps_client_socket, length=MSG_BYTES, timeout=wait_time)

    if response != MSG_BYTES:
        pho_err_occurred = True
        msg = 'Error while reading operation data from request "{}".'.format(PhoRequestND[request_id])
        handle_socket_read_error(response, True, False, msg)
        return None

    (msg,) = struct.unpack(BYTEORDER_FMT + 'i', op_data)
    return msg


def bps_client_handle_received_available_solutions(solutions_count, wait_time=0.5):
    """
    Received ids of available solutions
    :return: List of ids of available solutions
    """
    global bps_client_socket, pho_err_occurred, pho_err_code, PhoRequestND

    MSG_BYETS = 4
    available_solutions_list = []

    for solution in range(solutions_count):
        response, solution_id = client_socket_read(bps_client_socket, length=MSG_BYETS, timeout=wait_time)
        if response != MSG_BYETS:
            pho_err_occurred = True
            msg = 'Error while reading available solutions "{}".'.format(PhoRequestND[13])
            handle_socket_read_error(response, True, False, msg)
            return None

        (msg,) = struct.unpack(BYTEORDER_FMT + 'i', solution_id)
        available_solutions_list.append(msg)

    return available_solutions_list


def bps_client_handle_operation_object_pose(request_id, wait_time=0.5):
    """
    Receives the data corresponding to subheader with operation type PhoOperationType.OBJECT_POSE
    Check 'posx()' documentation for rotation explanation
    :return: 'posx' object on success, None on failure
    """
    global bps_client_socket, pho_err_occurred, pho_err_code, PhoRequestND
    MSG_BYTES = 24  # x, y, z, Rz, Ry, Rz'
    response, op_data = client_socket_read(bps_client_socket, length=MSG_BYTES, timeout=wait_time)

    if response != MSG_BYTES:
        pho_err_occurred = True
        msg = 'Error while reading "pose" operation data from request "{}".'.format(PhoRequestND[request_id])
        handle_socket_read_error(response, True, False, msg)
        return None

    x, y, z, rz, ry, rz2 = struct.unpack(BYTEORDER_FMT + '6f', op_data)
    rot_deg = rad_2_deg([rz, ry, rz2])
    return posx(x, y, z, rot_deg[0], rot_deg[1], rot_deg[2])


def bps_client_recv_response(request_id, wait_time):
    """
    Receives responses to previously sent requests to BPS server.
    :param request_id: (int) ID of sent request, for which a response is to be received.
    :param wait_time: (float) Time to wait for response in seconds
    :return: True if no error occurred, False otherwise
    """
    global BYTEORDER_FMT, bps_client_socket, pho_err_code, pho_err_occurred, pho_requests_blocked, \
        PhoRequestND, PhoOperationTypeND, PhoGripperCmdND, PhoOperationInfoND, pho_info_data, \
        pho_tool_point_invariance, pho_gripping_point_id, pho_gripping_point_invariance, \
        pho_object_pose, pho_reprojection_error, pho_last_request_id, pho_running_solution, \
        pho_available_solutions

    # Check if correct request was sent preceding this receive call
    if request_id != pho_last_request_id:
        pho_err_occurred = True
        if pho_last_request_id is None:
            tp_popup('Program flow error. Missing request call preceding the current response call.', DR_PM_ALARM, 1)
        else:
            tp_popup('Program flow error. Incorrect request call preceding the current response call. '
                   'Expected "{}"'.format(PhoRequestND.get(request_id, request_id)), DR_PM_ALARM, 1)
        return False

    if request_id not in PhoRequestND.keys():
        pho_err_occurred = True
        tp_log('Unknown request id: {}'.format(request_id))
        return False

    HEADER_SIZE = 12
    SUB_HEADER_SIZE = 12

    # Check socket status
    socket_status = client_socket_state(bps_client_socket)
    if socket_status != 1:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.COMM_FAILURE
        return not pho_err_occurred

    # Clear flags from previous request
    pho_err_occurred = False
    pho_err_code = PhoCommErr.OK
    pho_last_request_id = None

    # Wait for message header
    response, data = client_socket_read(bps_client_socket, length=HEADER_SIZE, timeout=wait_time)

    if response != HEADER_SIZE:
        pho_err_occurred = True
        handle_socket_read_error(response, True, True, 'Binpicking client.', 'Expected header data.')
        return not pho_err_occurred

    recv_req_id, n_subheaders, _ = struct.unpack(BYTEORDER_FMT + '3i', data)

    # Check if response matches the request type
    if recv_req_id != request_id:
        tp_log('ERROR: Request was "{}" ({}). Received "{}" ({})'.format(
            PhoRequestND[request_id], request_id, PhoRequestND.get(recv_req_id, '?'), recv_req_id))

        pho_err_occurred = True
        pho_err_code = PhoCommErr.BAD_DATA
        bps_client_flush_socket()

        return not pho_err_occurred

    if PHO_DEBUG:
        tp_log('Response to "{}" request: header: {} subheaders'.format(PhoRequestND[request_id], n_subheaders))

    # Start reading & processing subheaders
    for i_sub in range(n_subheaders):

        # Read subheader
        response, data = client_socket_read(bps_client_socket, length=SUB_HEADER_SIZE, timeout=wait_time)

        if response != SUB_HEADER_SIZE:
            pho_err_occurred = True
            handle_socket_read_error(response, True, True, 'Binpicking client.',
                                     'Expected {} sub-header data ({}B).'.format(__int2ord(i_sub), SUB_HEADER_SIZE))
            break

        operation_type, operation_number, data_array_count = struct.unpack(BYTEORDER_FMT + '3i', data)

        if PHO_DEBUG:
            tp_log('Read subheader {}. Operation type/number/data_array_count: {}/{}/{}'.format(
                i_sub,
                PhoOperationTypeND.get(operation_type, str(operation_type)),
                operation_number,
                data_array_count
            ))

        if request_id == PhoRequest.TRAJECTORY:
            pho_operations.append(operation_type)

        if operation_type == PhoOperationType.TRAJECTORY_CNT:
            bps_client_handle_operation_trajectory(data_array_count, False, wait_time)
        elif operation_type == PhoOperationType.TRAJECTORY_FINE:
            bps_client_handle_operation_trajectory(data_array_count, True, wait_time)
        elif operation_type == PhoOperationType.GRIPPER:
            gripper_op = bps_client_handle_operation_other(request_id)
            if PHO_DEBUG:
                tp_log('Received gripper operation: {} (operation number: {})'.format(gripper_op, operation_number))
        elif operation_type == PhoOperationType.ERROR:
            bps_client_handle_operation_error(data_array_count * 4, request_id)
            if pho_err_occurred:
                break
        elif operation_type == PhoOperationType.INFO:
            if recv_req_id == PhoRequest.GET_RUNNING_SOLUTION:
                pho_running_solution = bps_client_handle_operation_other(request_id)
                if PHO_DEBUG:
                    tp_log('Received running solution: {}'.format(pho_running_solution))
            elif recv_req_id == PhoRequest.GET_AVAILABLE_SOLUTIONS:
                pho_available_solutions = bps_client_handle_received_available_solutions(data_array_count)
                tp_log('available solutions: {}'.format(pho_available_solutions))
                pass
            else:
                pho_info = bps_client_handle_operation_other(request_id)
                pass
                if operation_number == PhoOperationInfo.TOOL_POINT_INV:
                    pho_tool_point_invariance = pho_info
                    if PHO_DEBUG:
                        tp_log('Received Info operation: tool_point_invariance: {}'.format(pho_info))
                elif operation_number == PhoOperationInfo.GRIPPING_ID:
                    pho_gripping_point_id = pho_info
                    if PHO_DEBUG:
                        tp_log('Received Info operation: gripping_point_id: {}'.format(pho_info))
                elif operation_number == PhoOperationInfo.GRIPPING_POINT_INV:
                    pho_gripping_point_invariance = pho_info
                    if PHO_DEBUG:
                        tp_log('Received Info operation: gripping_point_invariance: {}'.format(pho_info))
                else:
                    pho_info_data.append(pho_info)
                    if PHO_DEBUG:
                        tp_log('Received Info: {}'.format(pho_info))

        elif operation_type == PhoOperationType.OBJECT_POSE:
            pho_object_pose = bps_client_handle_operation_object_pose(request_id)
        else:
            msg = 'Response to "{}" request: Unknown type of operation received: {}'.format(
                PhoRequestND[request_id],
                PhoOperationTypeND.get(operation_type, )
            )
            tp_popup(msg, DR_PM_MESSAGE, 0)
            pho_err_occurred = True
            pho_err_code = PhoCommErr.UNKNOWN
            break
    return not pho_err_occurred


def pho_request_init(pho_start_bin_picking_pose, pho_end_bin_picking_pose, vision_system_id, wait_time=-1):
    """
    Request to initialize a bin picking session
    Sends start and end poses to Binpicking server.
    :param pho_start_bin_picking_pose: start pose. (posj) object or iterable with joint 1 - 6 states [deg]
    :param pho_end_bin_picking_pose: end pose. (posj) object or iterable with joint 1 - 6 states [deg]
    :param vision_system_id: (int) ID of the vision system
    :param wait_time: time to wait for response [sec]
    """
    global BYTEORDER_FMT, pho_requests_blocked

    start_pose_rad = deg_2_rad(pho_start_bin_picking_pose)
    end_pose_rad = deg_2_rad(pho_end_bin_picking_pose)
    joints_deg = [j_rad for j_rad in start_pose_rad] + [j_rad for j_rad in end_pose_rad]

    data = struct.pack(BYTEORDER_FMT + '12f', *joints_deg)

    if bps_client_send_request(PhoRequest.INITIALIZE, vision_system_id, data):
        bps_client_recv_response(PhoRequest.INITIALIZE, wait_time)
        pho_requests_blocked = False


def pho_request_scan(vision_system_id):
    """
    Sends a scan request
    """
    global PHO_DEBUG

    if PHO_DEBUG:
        tp_log('Binpicking client: Sending SCAN request for VS {}...'.format(vision_system_id))

    bps_client_send_request(PhoRequest.SCAN, vision_system_id)


def pho_request_trajectory(vision_system_id):
    """
    Sends request to receive a new trajectory
    """
    global pho_pick_allowed, pho_trajectory_buffer, pho_operations

    # Clear buffers from the previous trajectories
    pho_trajectory_buffer = []
    pho_operations = []

    bps_client_send_request(PhoRequest.TRAJECTORY, vision_system_id)
    pho_pick_allowed = False


def pho_request_calib_add_point():
    """
    Request to add point to calibration. Function is waiting for a confirmation from Vision Controller
    """
    global pho_requests_blocked
    if bps_client_send_request(PhoRequest.CALIB_ADD_POINT, 0):
        bps_client_recv_response(PhoRequest.CALIB_ADD_POINT, -1)
        pho_requests_blocked = False


def pho_request_send_pick_failed(vision_system_id):
    """
    Request to send pick failed
    """
    global pho_requests_blocked
    if bps_client_send_request(PhoRequest.PICK_FAILED, vision_system_id):
        bps_client_recv_response(PhoRequest.PICK_FAILED, -1)
        pho_requests_blocked = False


def pho_request_change_solution(required_solution_id):
    """
    Request for solution change
    """
    global pho_requests_blocked, BYTEORDER_FMT

    data = struct.pack(BYTEORDER_FMT + 'i', required_solution_id)

    if bps_client_send_request(PhoRequest.CHANGE_SOLUTION, 0, data):
        bps_client_recv_response(PhoRequest.CHANGE_SOLUTION, -1)
        pho_requests_blocked = False


def pho_request_start_solution(required_solution_id):
    """
    Request for start solution
    """
    global pho_requests_blocked, BYTEORDER_FMT

    data = struct.pack(BYTEORDER_FMT + 'i', required_solution_id)

    if bps_client_send_request(PhoRequest.START_SOLUTION, 0, data):
        bps_client_recv_response(PhoRequest.START_SOLUTION, -1)
        pho_requests_blocked = False


def pho_request_stop_solution():
    """
    Request for stop solution
    """
    global pho_requests_blocked, BYTEORDER_FMT

    if bps_client_send_request(PhoRequest.STOP_SOLUTION, 0):
        bps_client_recv_response(PhoRequest.STOP_SOLUTION, -1)
        pho_requests_blocked = False


def pho_request_get_running_solution():
    """
    Request for get running solution
    """
    global pho_requests_blocked, BYTEORDER_FMT

    if bps_client_send_request(PhoRequest.GET_RUNNING_SOLUTION, 0):
        bps_client_recv_response(PhoRequest.GET_RUNNING_SOLUTION, -1)
        pho_requests_blocked = False


def pho_request_get_available_solutions():
    """
    Request for get available solutions
    """
    global pho_requests_blocked, BYTEORDER_FMT

    if bps_client_send_request(PhoRequest.GET_AVAILABLE_SOLUTIONS, 0):
        bps_client_recv_response(PhoRequest.GET_AVAILABLE_SOLUTIONS, -1)
        pho_requests_blocked = False


def pho_request_object_pose(vision_system_id):
    """
    Request for an object pose
    """
    global pho_requests_blocked
    if bps_client_send_request(PhoRequest.OBJECT_POSE, vision_system_id):
        bps_client_recv_response(PhoRequest.OBJECT_POSE, -1)
        pho_requests_blocked = False


def pho_other_req(vision_system_id, data):
    """
    Request to send other customer data
    :param vision_system_id: (int) ID of the Vision System
    :param data: (bytes) data to be sent
    """
    global pho_requests_blocked, pho_err_occurred, pho_err_code

    if type(data) is not bytes:
        pho_err_occurred = True
        pho_err_code = PhoCommErr.BAD_DATA
        tp_log('Error: incorrect data in customer request! Expecting bytes, got "{}".'.format(type(data)))
        return

    bps_client_send_request(PhoRequest.CUSTOMER, vision_system_id, data)
    pho_requests_blocked = False  # Not expecting any response


# ===== RESPONSES =====
def pho_wait_for_scan_completion(wait_time=-1):
    """
    Function to wait for confirmation message from the Vision Controller that the scanning has finished
    """
    global PHO_DEBUG, pho_err_occurred, pho_err_code, pho_requests_blocked

    if pho_err_occurred:
        if pho_err_code in [PhoCommErr.TIMEOUT, PhoCommErr.BAD_DATA, PhoCommErr.COMM_FAILURE]:
            return

    bps_client_recv_response(PhoRequest.SCAN, wait_time)
    pho_requests_blocked = False


def pho_receive_trajectory(wait_time=-1):
    """
    Receives a new trajectory from the Vision Controller after requesting it
    """
    global pho_pick_allowed, pho_requests_blocked, pho_err_occurred, pho_err_code

    if pho_err_occurred:
        if pho_err_code in [PhoCommErr.TIMEOUT, PhoCommErr.BAD_DATA, PhoCommErr.COMM_FAILURE]:
            return

    bps_client_recv_response(PhoRequest.TRAJECTORY, wait_time)
    pho_requests_blocked = False
    pho_pick_allowed = True





# CustomerDefinitions module v.1.6
# Copyright(c) 2022 Photoneo s.r.o.
# All rights reserved

# Implement gripper commands and adapt binpicking sequences to meet your application requirements

# -----------------------------------------------------------------------------
# -------------------- GRIPPER COMMANDS TO BE IMPLEMENTED ---------------------
# -----------------------------------------------------------------------------

# Implement command to attach part to gripper here
def gripper_attach():
    pass


# Implement command to detach part from gripper here
def gripper_detach():
    pass


# Implement your custom gripper command here
def gripper_user_1():
    pass


# Implement your custom gripper command here
def gripper_user_2():
    pass


# Implement your custom gripper command here
def gripper_user_3():
    pass


# -----------------------------------------------------------------------------
# ------------------------ BIN PICKING SPEED SETTINGS -------------------------
# -----------------------------------------------------------------------------

def binpicking_settings():
    """
    Set the joint speeds and accelerations for gripping path stages defined in Binpicking solution.
    Values are in [degrees per second] / [degrees per second^2].
    For each trajectory is possible to use a float value, which sets the same speed for each joint
    or a list of 6 floats, i.e. speed for joint 1 ... 6. [j1, j2, j3, j4, j5, j6]
    Acceleration settings are analogous to the speed settings.
    """
    global pho_speed_data, pho_acceleration_data

    # Init/reset the global settings
    pho_speed_data = []
    pho_acceleration_data = []

    # Maximal joint velocities for Doosan M1013 (j1, ...,j6) [degrees per second]
    # Adjust the joint velocities as appropriate for your application. Note that real velocities may be lower
    # than values defined here - depending on the distances of trajectory waypoints
    max_velocity = [120.0, 120.0, 180.0, 225.0, 225.0, 225.0]

    # Joint accelerations for (j1, ...,j6) [degrees per second^2]
    # Adjust the joint accelerations as appropriate for your application. Note that real accelerations may be lower
    # than values defined here - depending on the distances of trajectory waypoints
    acceleration = [400] * 6

    # 1st trajectory speed (Approach trajectory by default)
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 2nd trajectory speed (Grasp trajectory by default)
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 3rd trajectory speed (Deapproach trajectory by default)
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 4th trajectory speed (End trajectory by default)
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 5th trajectory speed
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)

    # 6th trajectory speed
    pho_speed_data.append([maxvj * 1.0 for maxvj in max_velocity])
    pho_acceleration_data.append(acceleration)


# -----------------------------------------------------------------------------
# ------------------------BIN PICKING IMPLEMENTATIONS -------------------------
# -----------------------------------------------------------------------------


def pho_bin_picking():
    """
    DO NOT EDIT!!!
    Standard bin picking implementation
    Allows for an execution of various number of operations. Joint velocities and accelerations
    are defined in 'binpicking_settings()'
    """
    global PHO_DEBUG, pho_trajectory_buffer, pho_operations, pho_speed_data, pho_acceleration_data, \
        pho_err_occurred, pho_pick_allowed

    trajectory_id = 0
    gripper_cmd_id = 1  # PhoGripperCmd.ATTACH

    # Set velocities and accelerations
    binpicking_settings()

    # Make sure that no errors occurred, otherwise return from the function
    if not pho_err_occurred:
        if not pho_pick_allowed:
            msg = 'Program flow error! Pick rejected. Possible causes: Repeated call: pho_bin_picking() OR '
            msg += 'Missing call: pho_receive_trajectory()'
            tp_popup(msg, DR_PM_ALARM, 1)
        else:
            # Execute received operations
            n_ops = len(pho_operations)
            for i, operation in enumerate(pho_operations):
                if PHO_DEBUG:
                    tp_log(
                        'operation {} of {}: {}({})...'.format(i, n_ops, PhoOperationTypeND.get(operation, '?'), operation))

                if operation in [PhoOperationType.TRAJECTORY_FINE, PhoOperationType.TRAJECTORY_CNT]:
                    velocity = pho_speed_data[trajectory_id]
                    acceleration = pho_acceleration_data[trajectory_id]

                    # Execute the movement (the robot have to start in the waypoint at index 0)
                    movesj(pho_trajectory_buffer[trajectory_id][1:], v=velocity, a=acceleration)
                    trajectory_id += 1

                elif operation == PhoOperationType.GRIPPER:
                    execute_gripper(gripper_cmd_id)
                    gripper_cmd_id += 1

    # Reset pick allowed flag
    pho_pick_allowed = False


def pho_execute_trajectory(trajectory_id, velocity=-1, acceleration=-1):
    """
    Executes a single trajectory
    :param trajectory_id: ID of the trajectory to executeut
    :param velocity: positive float value or a list of 6 such values of joint velocities [deg/s] *
    :param acceleration: positive float value or a list of 6 such values of joint velocities [deg/s^2] *
    * otherwise global settings will be used from 'pho_speed_data', 'pho_acceleration_data'
    """
    global PHO_DEBUG, pho_trajectory_buffer, pho_operations, pho_speed_data, pho_acceleration_data
    use_velocity = 0
    use_acceleration = 0

    if PHO_DEBUG:
        tp_log('Executing trajectory {}'.format(trajectory_id))

    # Check if requested trajectory ID exists, exit if not
    if 0 <= trajectory_id < len(pho_trajectory_buffer):
        trajectory_waypoints = pho_trajectory_buffer[trajectory_id]

        # Determine which velocity will be used
        if hasattr(velocity, '__len__'):
            if len(velocity) == 6:
                use_velocity = velocity
        elif velocity > 0:
            use_velocity = velocity
        else:
            use_velocity = pho_speed_data[trajectory_id]

        # Determine which acceleration will be used
        if hasattr(acceleration, '__len__'):
            if len(acceleration) == 6:
                use_acceleration = acceleration
        elif acceleration > 0:
            use_acceleration = acceleration
        else:
            use_acceleration = pho_acceleration_data[trajectory_id]

        # Execute the movement (the robot have to start in the waypoint at index 0)
        movesj(trajectory_waypoints[1:], v=use_velocity, a=use_acceleration)


def execute_gripper(gripper_cmd_id):
    """
    Calls user defined code for executing a gripper command
    :param gripper_cmd_id: constant defined in PhoGripperCmd
    """
    if gripper_cmd_id == PhoGripperCmd.ATTACH:
        gripper_attach()
    elif gripper_cmd_id == PhoGripperCmd.DETACH:
        gripper_detach()
    elif gripper_cmd_id == PhoGripperCmd.USER_1:
        gripper_user_1()
    elif gripper_cmd_id == PhoGripperCmd.USER_2:
        gripper_user_2()
    elif gripper_cmd_id == PhoGripperCmd.USER_3:
        gripper_user_3()

#BINPICKING_SRV_IP = '192.168.137.10'
#BINPICKING_SRV_PORT = 11003
#STATE_SRV_PORT = 11004
def _CalibrationAddButton():
    global pho_err_code, pho_err_occurred, BINPICKING_SRV_IP,  home_pose, vel, acc

    pho_start_state_server()
    if not pho_wait_for_server (BINPICKING_SRV_IP):
        exit()

    movej(calibration_pose, vel=vel, acc=acc)

    # Request for add calibration point
    pho_request_calib_add_point()

#################### main ####################
# add plus button
_CalibrationAddButton()


`


