'use client'

import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import {
  RiPlanetFill,
  RiPlanetLine,
} from '@remixicon/react'
import classNames from '@/utils/classnames'
import { useAppContext } from '@/context/app-context'
type ExploreNavProps = {
  className?: string
}

const ExploreNav = ({
  className,
}: ExploreNavProps) => {
  const { t } = useTranslation()
  const selectedSegment = useSelectedLayoutSegment()
  const activated = selectedSegment === 'explore'
  const { isCurrentWorkspaceDatasetOperator } = useAppContext()

  // Only show explore nav for non-dataset operators
  if (isCurrentWorkspaceDatasetOperator)
    return null

  return (
    <Link href="/explore/apps" className={classNames(
      className, 'group',
      activated && 'bg-components-main-nav-nav-button-bg-active shadow-md',
      activated ? 'text-components-main-nav-nav-button-text-active' : 'text-components-main-nav-nav-button-text hover:bg-components-main-nav-nav-button-bg-hover',
    )}>
      {
        activated
          ? <RiPlanetFill className='h-4 w-4' />
          : <RiPlanetLine className='h-4 w-4' />
      }
      <div className='ml-2 max-[1024px]:hidden'>
        {t('common.menus.explore')}
      </div>
    </Link>
  )
}

export default ExploreNav
