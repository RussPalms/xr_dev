import { createContext, forwardRef, ReactNode, RefObject, useContext, useImperativeHandle, useRef } from 'react'
import { HandleOptions, useHandle } from './hook.js'
import { Group, Object3D } from 'three'
import { HandleStore } from '@pmndrs/handle'

const HandleTargetRefContext = createContext<RefObject<Object3D | null> | undefined>(undefined)

export const HandleTarget = forwardRef<Object3D, { children?: ReactNode; targetRef?: RefObject<Object3D | null> }>(
  ({ targetRef, children }, ref) => {
    const internalRef = useRef<Group>(null)
    useImperativeHandle(ref, () => (targetRef ?? internalRef).current!, [targetRef])
    if (targetRef != null) {
      return <HandleTargetRefContext.Provider value={targetRef}>{children}</HandleTargetRefContext.Provider>
    }
    return (
      <HandleTargetRefContext.Provider value={internalRef}>
        <group ref={internalRef}>{children}</group>
      </HandleTargetRefContext.Provider>
    )
  },
)

export const Handle = forwardRef<
  HandleStore<unknown>,
  {
    children?: ReactNode
    handleRef?: RefObject<Object3D | null>
    targetRef?: 'from-context' | RefObject<Object3D | null>
    /**
     * @deprecated use `targetRef="from-context"` instead
     */
    useTargetFromContext?: boolean
    getHandleOptions?: () => HandleOptions<unknown>
  } & Omit<HandleOptions<unknown>, 'handle'>
>(({ children, handleRef: providedHandleRef, useTargetFromContext, targetRef, getHandleOptions, ...props }, ref) => {
  const handleRef = useRef<Group>(null)
  let contextHandleTargetRef = useContext(HandleTargetRefContext)
  if (useTargetFromContext === true) {
    targetRef = 'from-context'
  }
  if (targetRef === 'from-context') {
    if (contextHandleTargetRef == null) {
      throw new Error(
        `no HandleTarget found in the context of this handle while 'targetRef="from-context"' is set. Either wrap the Handle in a <HandleTarget> or remove the 'targetRef="from-context"' property or set it to an ref.`,
      )
    }
    targetRef = contextHandleTargetRef
  }
  const handleTargetRef = targetRef ?? providedHandleRef ?? handleRef
  const store = useHandle(
    handleTargetRef,
    {
      handle: providedHandleRef ?? handleRef,
      ...props,
    },
    getHandleOptions,
  )
  useImperativeHandle(ref, () => store, [store])
  if (providedHandleRef != null) {
    return children
  }
  return <group ref={handleRef}>{children}</group>
})
