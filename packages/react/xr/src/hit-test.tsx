import { forwardRef, RefObject, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { createXRHitTestSource, GetWorldMatrixFromXRHitTest, requestXRHitTest } from '@pmndrs/xr'
import { useXRStore } from './xr.js'
import { Group, Matrix4, Object3D } from 'three'
import { ThreeElements, useFrame } from '@react-three/fiber'
import { useStore } from 'zustand'

export { createXRHitTestSource, requestXRHitTest, type GetWorldMatrixFromXRHitTest } from '@pmndrs/xr'

/**
 * hook for creating a hit test source originating from the provided object or xrspace
 */
export function useXRHitTestSource(
  relativeTo: RefObject<Object3D | null> | XRSpace | XRReferenceSpaceType,
  trackableType?: XRHitTestTrackableType | Array<XRHitTestTrackableType>,
) {
  const [source, setState] = useState<Awaited<ReturnType<typeof createXRHitTestSource>> | undefined>()
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useCreateXRHitTestSource(relativeTo, trackableType, setState)
  return source
}

/**
 * hook for setting up a continous hit test originating from the provided object or xrspace
 */
export function useXRHitTest(
  fn: ((results: Array<XRHitTestResult>, getWorldMatrix: GetWorldMatrixFromXRHitTest) => void) | undefined,
  relativeTo: RefObject<Object3D | null> | XRSpace | XRReferenceSpaceType,
  trackableType?: XRHitTestTrackableType | Array<XRHitTestTrackableType>,
) {
  const sourceRef = useRef<Awaited<ReturnType<typeof createXRHitTestSource>>>(undefined)
  useCreateXRHitTestSource(
    relativeTo,
    trackableType,
    useCallback((source) => (sourceRef.current = source), []),
  )
  useFrame((_s, _d, frame: XRFrame | undefined) => {
    if (fn == null || frame == null || sourceRef.current == null) {
      return
    }
    fn(frame.getHitTestResults(sourceRef.current.source), sourceRef.current.getWorldMatrix)
  })
}

function useCreateXRHitTestSource(
  relativeTo: RefObject<Object3D | null> | XRSpace | XRReferenceSpaceType,
  trackableType: undefined | XRHitTestTrackableType | Array<XRHitTestTrackableType>,
  onLoad: (result: Awaited<ReturnType<typeof createXRHitTestSource>>) => void,
) {
  const store = useXRStore()
  const session = useStore(store, (s) => s.session)
  useEffect(() => {
    if (session == null) {
      return
    }
    let storedResult: Awaited<ReturnType<typeof createXRHitTestSource>>
    let cancelled = false
    const relativeToResolved =
      relativeTo instanceof XRSpace || typeof relativeTo === 'string' ? relativeTo : relativeTo?.current
    if (relativeToResolved == null) {
      return
    }
    createXRHitTestSource(store, session, relativeToResolved, trackableType).then((result) => {
      if (cancelled) {
        return
      }
      storedResult = result
      onLoad(result)
    })
    return () => {
      onLoad(undefined)
      cancelled = true
      storedResult?.source.cancel()
    }
  }, [session, store, relativeTo, trackableType, onLoad])
}

/**
 * hook that returns a function to request a single hit test
 */
export function useXRRequestHitTest() {
  const store = useXRStore()
  return useCallback(
    (
      relativeTo: RefObject<Object3D | null> | XRSpace | XRReferenceSpaceType,
      trackableType?: XRHitTestTrackableType | Array<XRHitTestTrackableType>,
    ) => {
      const relativeToResolved =
        relativeTo instanceof XRSpace || typeof relativeTo === 'string' ? relativeTo : relativeTo.current
      if (relativeToResolved == null) {
        return
      }
      return requestXRHitTest(store, relativeToResolved, trackableType)
    },
    [store],
  )
}

/**
 * component for getting hit tests originating based on its position in the scene graph
 */
export const XRHitTest = forwardRef<
  Group,
  Omit<ThreeElements['group'], 'children'> & {
    space?: XRSpace | XRReferenceSpaceType
    trackableType?: XRHitTestTrackableType | Array<XRHitTestTrackableType>
    onResults?: (results: Array<XRHitTestResult>, getWorldMatrix: GetWorldMatrixFromXRHitTest) => void
  }
>(({ trackableType, onResults, space, ...rest }, ref) => {
  const internalRef = useRef<Group>(null)
  useImperativeHandle(ref, () => internalRef.current!)
  useXRHitTest(onResults, space ?? internalRef, trackableType)
  return <group {...rest} ref={internalRef} />
})
