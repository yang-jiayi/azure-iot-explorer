/***********************************************************
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License
 **********************************************************/
import 'jest';
import { cloneableGenerator, SagaIteratorClone } from 'redux-saga/utils';
import { call, put } from 'redux-saga/effects';
import * as DevicesService from '../../../api/services/devicesService';
import { invokeDeviceMethodSaga, notifyMethodInvoked } from './deviceMethodSaga';
import { invokeDeviceMethodAction } from '../actions';
import { InvokeMethodParameters } from '../../../api/parameters/deviceParameters';
import { addNotificationAction } from '../../../notifications/actions';
import { ResourceKeys } from '../../../../localization/resourceKeys';
import { NotificationType } from '../../../api/models/notification';

describe('deviceMethodSaga', () => {
    let invokeDeviceMethodSagaGenerator: SagaIteratorClone;
    let notifyMethodInvokedGenerator: SagaIteratorClone;
    let notifyMethodInvokedGeneratorNoPayload: SagaIteratorClone;

    const mockInvokeDeviceMethod = jest.spyOn(DevicesService, 'invokeDeviceMethod').mockImplementation(parameters => {
        return null;
    });

    const randomNumber = 0;

    const mockRandom = jest.spyOn(Math, 'random').mockImplementation(() => {
        return randomNumber;
    });

    const connectionString = 'connection_string';
    const connectTimeoutInSeconds = 10;
    const deviceId = 'device_id';
    const methodName = 'test';
    const payload = {
        body: 'test'
    };
    const responseTimeoutInSeconds = 10;

    const invokeMethodParameters: InvokeMethodParameters = {
        connectTimeoutInSeconds,
        connectionString,
        deviceId,
        methodName,
        payload,
        responseTimeoutInSeconds
    };

    const invokeMethodParametersNoPayload: InvokeMethodParameters = {...invokeMethodParameters};
    invokeMethodParametersNoPayload.payload = undefined;

    beforeAll(() => {
        invokeDeviceMethodSagaGenerator = cloneableGenerator(invokeDeviceMethodSaga)(invokeDeviceMethodAction.started(invokeMethodParameters));
    });

    beforeEach(() => {
        notifyMethodInvokedGenerator = cloneableGenerator(notifyMethodInvoked)(randomNumber, invokeDeviceMethodAction.started(invokeMethodParameters));
        notifyMethodInvokedGeneratorNoPayload = cloneableGenerator(notifyMethodInvoked)(randomNumber, invokeDeviceMethodAction.started(invokeMethodParametersNoPayload));
    });

    describe('notifyMethodInvoked', () => {
        it('puts a notification with payload if there is a payload', () => {
            expect(notifyMethodInvokedGenerator.next()).toEqual({
                done: false,
                value: put(addNotificationAction.started({
                    id: randomNumber,
                    text: {
                        translationKey: ResourceKeys.notifications.invokingMethodWithPayload,
                        translationOptions: {
                            deviceId,
                            methodName,
                            payload: JSON.stringify(payload),
                        },
                    },
                    type: NotificationType.info
                }))
            });

            expect(notifyMethodInvokedGenerator.next().done).toEqual(true);
        });

        it('puts a notification with payload if there is no payload', () => {
            expect(notifyMethodInvokedGeneratorNoPayload.next()).toEqual({
                done: false,
                value: put(addNotificationAction.started({
                    id: randomNumber,
                    text: {
                        translationKey: ResourceKeys.notifications.invokingMethod,
                        translationOptions: {
                            deviceId,
                            methodName
                        },
                    },
                    type: NotificationType.info,
                }))
            });

            expect(notifyMethodInvokedGeneratorNoPayload.next().done).toEqual(true);
        });
    });

    describe('invokeDeviceMethodSaga', () => {

        it('notifies that the method is being invoked', () => {
            expect(invokeDeviceMethodSagaGenerator.next(randomNumber)).toEqual({
                done: false,
                value: call(notifyMethodInvoked, randomNumber, invokeDeviceMethodAction.started(invokeMethodParameters))
            });
        });

        it('successfully invokes the method', () => {
            const success = invokeDeviceMethodSagaGenerator.clone();

            expect(success.next(payload)).toEqual({
                done: false,
                value: call(mockInvokeDeviceMethod, invokeMethodParameters)
            });

            const response = 'hello';

            expect(success.next(response)).toEqual({
                done: false,
                value: put(addNotificationAction.started({
                    id: randomNumber,
                    text: {
                        translationKey: ResourceKeys.notifications.invokeMethodOnSuccess,
                        translationOptions: {
                            deviceId,
                            methodName,
                            response
                        },
                    },
                    type: NotificationType.success
                }))
            });

            expect(success.next()).toEqual({
                done: false,
                value: put(invokeDeviceMethodAction.done({
                    params: invokeMethodParameters,
                    result: response
                }))
            });
        });

        it('fails', () => {
            const failed = invokeDeviceMethodSagaGenerator.clone();
            const error = { code: -1 };

            expect(failed.throw(error)).toEqual({
                done: false,
                value: put(addNotificationAction.started({
                    id: randomNumber,
                    text: {
                        translationKey: ResourceKeys.notifications.invokeMethodOnError,
                        translationOptions: {
                            deviceId,
                            error
                        },
                    },
                    type: NotificationType.error
                }))
            });

            expect(failed.next(error)).toEqual({
                done: false,
                value: put(invokeDeviceMethodAction.failed({
                    error,
                    params: invokeMethodParameters
                }))
            });

            expect(failed.next().done).toEqual(true);
        });

    });
});
